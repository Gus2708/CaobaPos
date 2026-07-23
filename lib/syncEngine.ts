import { supabase } from './supabase';
import {
  getOfflineQueue,
  removeOfflineItem,
  updateOfflineItem,
  OfflineQueueItem,
} from './offlineQueue';
import { getIsOnline } from './networkStatus';
import { QueryClient } from '@tanstack/react-query';

type SyncListener = (isSyncing: boolean, progress?: { current: number; total: number }) => void;

let isSyncingState = false;
let globalQueryClient: QueryClient | null = null;
const syncListeners: Set<SyncListener> = new Set();
const tempIdMap = new Map<string, string>(); // Maps temp offline IDs to real server IDs

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
      await processSingleItem(item);
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
    globalQueryClient.invalidateQueries({ queryKey: ['categories'] });
    globalQueryClient.invalidateQueries({ queryKey: ['sales-history'] });
    globalQueryClient.invalidateQueries({ queryKey: ['clients_balances'] });
  }

  return { successCount, errorCount };
}

async function processSingleItem(item: OfflineQueueItem): Promise<void> {
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
      }
      break;
    }

    case 'CREATE_SALE': {
      let { totalAmount, paymentMethod, items, clientId, ivaEnabled, taxAmount } = item.payload;

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
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          total_amount: totalAmount,
          payment_method: paymentMethod,
          client_id: clientId || null,
          status,
          iva_enabled: ivaEnabled || false,
          tax_amount: taxAmount || 0,
        })
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

    case 'DELETE_SALE': {
      const { saleId } = item.payload;
      // Delete payments
      await supabase.from('client_payments').delete().eq('sale_id', saleId);
      // Delete items
      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      // Delete sale
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) throw error;
      break;
    }

    default:
      console.warn(`[SyncEngine] Unknown action type: ${(item as any).type}`);
  }
}
