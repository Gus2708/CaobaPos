import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import {
  getOfflineQueue,
  removeOfflineItem,
  updateOfflineItem,
  OfflineQueueItem,
} from './offlineQueue';
import { getIsOnline } from './networkStatus';
import { removeOfflineSale } from './offlineCache';
import { deleteSaleWithStockRestore, updateSaleWithStockAdjustment } from './saleMutations';
import { QueryClient } from '@tanstack/react-query';

type SyncListener = (isSyncing: boolean, progress?: { current: number; total: number }) => void;

const TEMP_ID_MAP_STORAGE_KEY = '@caobapos_temp_id_map_v1';

let isSyncingState = false;
let globalQueryClient: QueryClient | null = null;
const syncListeners: Set<SyncListener> = new Set();
const tempIdMap = new Map<string, string>(); // Maps temp offline IDs to real server IDs
let tempIdMapLoaded = false;

async function ensureTempIdMapLoaded(): Promise<void> {
  if (tempIdMapLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(TEMP_ID_MAP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      Object.entries(parsed).forEach(([k, v]) => tempIdMap.set(k, v));
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to read tempIdMap from AsyncStorage:', err);
  }
  tempIdMapLoaded = true;
}

async function persistTempIdMap(): Promise<void> {
  try {
    const obj: Record<string, string> = {};
    tempIdMap.forEach((v, k) => {
      obj[k] = v;
    });
    await AsyncStorage.setItem(TEMP_ID_MAP_STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn('[SyncEngine] Failed to save tempIdMap to AsyncStorage:', err);
  }
}

export function resetInMemoryTempIdMapForTests(): void {
  tempIdMap.clear();
  tempIdMapLoaded = false;
}

export function registerQueryClientForSync(queryClient: QueryClient) {
  globalQueryClient = queryClient;
}

export function subscribeSyncState(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(isSyncingState);
  return () => {
    syncListeners.delete(listener);
  };
}

function notifySyncState(isSyncing: boolean, progress?: { current: number; total: number }) {
  isSyncingState = isSyncing;
  syncListeners.forEach((listener) => listener(isSyncing, progress));
}

export async function processSyncQueue(): Promise<{ successCount: number; errorCount: number }> {
  if (isSyncingState) {
    return { successCount: 0, errorCount: 0 };
  }

  if (!getIsOnline()) {
    return { successCount: 0, errorCount: 0 };
  }

  await ensureTempIdMapLoaded();

  const queue = await getOfflineQueue();
  const pendingItems = queue.filter((item) => item.status !== 'failed');

  if (pendingItems.length === 0) {
    return { successCount: 0, errorCount: 0 };
  }

  notifySyncState(true, { current: 0, total: pendingItems.length });

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];

    // Verify network still online before each step
    if (!getIsOnline()) {
      console.log('[SyncEngine] Network lost during sync, pausing batch.');
      break;
    }

    notifySyncState(true, { current: i + 1, total: pendingItems.length });
    await updateOfflineItem(item.id, { status: 'syncing' });

    try {
      await processSingleItem(item, pendingItems);
      await removeOfflineItem(item.id);
      successCount++;
    } catch (err: any) {
      console.error(`[SyncEngine] Error syncing item ${item.type} (${item.id}):`, err);
      const isNetworkErr = err?.message?.includes('Network') || err?.message?.includes('fetch') || err?.status === 0;

      if (isNetworkErr) {
        // Pause sync for network error, leave item as pending
        await updateOfflineItem(item.id, { status: 'pending' });
        errorCount++;
        break;
      } else {
        // Logic or DB error (e.g. constraint violation) — mark item as failed with error details
        await updateOfflineItem(item.id, {
          status: 'failed',
          retryCount: item.retryCount + 1,
          errorMessage: err?.message || 'Error al sincronizar con el servidor',
        });
        errorCount++;
      }
    }
  }

  notifySyncState(false);

  // Invalidate queries after sync batch so UI reflects server state
  if (globalQueryClient && successCount > 0) {
    globalQueryClient.invalidateQueries({ queryKey: ['products'] });
    globalQueryClient.invalidateQueries({ queryKey: ['inventory-products'] });
    globalQueryClient.invalidateQueries({ queryKey: ['categories'] });
    globalQueryClient.invalidateQueries({ queryKey: ['sales-history'] });
    globalQueryClient.invalidateQueries({ queryKey: ['dashboard'] });
    globalQueryClient.invalidateQueries({ queryKey: ['clients_balances'] });
  }

  return { successCount, errorCount };
}

async function rewriteTempClientReferences(
  tempId: string,
  realId: string,
  pendingItems: OfflineQueueItem[]
): Promise<void> {
  for (const queued of pendingItems) {
    if (
      (queued.type === 'CREATE_SALE' || queued.type === 'ADD_PAYMENT') &&
      queued.payload?.clientId === tempId
    ) {
      queued.payload = { ...queued.payload, clientId: realId };
      await updateOfflineItem(queued.id, { payload: queued.payload });
    } else if (queued.type === 'DELETE_CLIENT' && queued.payload?.id === tempId) {
      queued.payload = { ...queued.payload, id: realId };
      await updateOfflineItem(queued.id, { payload: queued.payload });
    }
  }
}

async function processSingleItem(
  item: OfflineQueueItem,
  pendingItems: OfflineQueueItem[]
): Promise<void> {
  switch (item.type) {
    case 'CREATE_CLIENT': {
      const { tempId, name, phone } = item.payload;
      const { data, error } = await supabase
        .from('clients')
        .insert({ name, phone })
        .select()
        .single();

      if (error) throw error;
      if (tempId && data?.id) {
        tempIdMap.set(tempId, data.id);
        await persistTempIdMap();
        await rewriteTempClientReferences(tempId, data.id, pendingItems);
      }
      break;
    }

    case 'CREATE_SALE': {
      let {
        tempSaleId,
        offlineId,
        totalAmount,
        paymentMethod,
        paymentDetails,
        items,
        clientId,
        ivaEnabled,
        taxAmount,
        discountAmount,
        exchangeRate,
        totalAmountBs,
      } = item.payload;

      // Resolve temp client ID if applicable
      if (clientId && tempIdMap.has(clientId)) {
        clientId = tempIdMap.get(clientId);
      } else if (clientId && clientId.startsWith('offline-')) {
        clientId = null; // Fallback to anonymous if temp client failed to map
      }

      // 1. Pre-fetch costs
      const productIds = items.map((i: any) => i.product_id);
      const { data: dbProducts } = await supabase
        .from('products')
        .select('id, cost')
        .in('id', productIds);

      // 2. Insert Sale
      const status = paymentMethod === 'credito' ? 'pending_payment' : 'paid';
      const saleInsertPayload: Record<string, any> = {
        total_amount: totalAmount,
        exchange_rate: exchangeRate || 1.0,
        total_amount_bs: totalAmountBs || totalAmount,
        payment_method: paymentMethod,
        client_id: clientId || null,
        status,
        iva_enabled: ivaEnabled || false,
        tax_amount: taxAmount || 0,
        created_by: item.payload.createdBy || null,
        employee_name: item.payload.employeeName || null,
        created_by_email: item.payload.createdByEmail || null,
      };
      if (paymentDetails) {
        saleInsertPayload.payment_details = paymentDetails;
      }
      if (discountAmount) {
        saleInsertPayload.discount_amount = discountAmount;
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleInsertPayload)
        .select()
        .single();

      if (saleError) throw saleError;

      // 3. Insert Sale Items
      const saleItems = items.map((it: any) => {
        const dbP = dbProducts?.find((p: any) => p.id === it.product_id);
        return {
          sale_id: sale.id,
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          subtotal: it.subtotal,
          unit_cost: dbP?.cost || 0,
        };
      });

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) {
        await supabase.from('sales').delete().eq('id', sale.id);
        throw itemsError;
      }

      // 4. Decrement Stock
      for (const it of items) {
        await supabase.rpc('decrement_stock', {
          p_product_id: it.product_id,
          p_quantity: it.quantity,
        });
      }

      const cachedSaleId = tempSaleId || offlineId;
      if (cachedSaleId) {
        await removeOfflineSale(cachedSaleId);
      }
      break;
    }

    case 'ADD_PAYMENT': {
      let { clientId, amount, paymentMethod, saleId } = item.payload;

      if (clientId && tempIdMap.has(clientId)) {
        clientId = tempIdMap.get(clientId);
      }

      const { error } = await supabase.from('client_payments').insert({
        client_id: clientId,
        sale_id: saleId || null,
        amount,
        payment_method: paymentMethod,
      });

      if (error) throw error;
      break;
    }

    case 'CREATE_PRODUCT': {
      const { product, categories } = item.payload;
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;

      if (categories && categories.length > 0 && data?.id) {
        const { data: catRows } = await supabase
          .from('categories')
          .select('id, name')
          .in('name', categories);

        if (catRows && catRows.length > 0) {
          const links = catRows.map((c: any) => ({
            product_id: data.id,
            category_id: c.id,
          }));
          await supabase.from('product_categories').insert(links);
        }
      }
      break;
    }

    case 'UPDATE_PRODUCT': {
      const { id, updates } = item.payload;
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      break;
    }

    case 'DELETE_PRODUCT': {
      const { id } = item.payload;
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      break;
    }

    case 'DELETE_CLIENT': {
      let { id } = item.payload;
      if (id && tempIdMap.has(id)) {
        id = tempIdMap.get(id);
      }
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      break;
    }

    case 'EDIT_SALE': {
      const { saleId, items, newTotal, ivaEnabled, taxAmount, exchangeRate } = item.payload;
      await updateSaleWithStockAdjustment({
        saleId,
        items,
        newTotal,
        ivaEnabled,
        taxAmount,
        exchangeRate,
      });
      break;
    }

    case 'DELETE_SALE': {
      const { saleId } = item.payload;
      await deleteSaleWithStockRestore(saleId);
      await removeOfflineSale(saleId);
      break;
    }

    default:
      throw new Error(`Acción sin sincronizador: ${(item as any).type}`);
  }
}
