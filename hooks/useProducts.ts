import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, useSettingsStore } from '../store/cartStore';
import { getIsOnline } from '../lib/networkStatus';
import {
  getCachedProducts,
  saveCachedProducts,
  getCachedCategories,
  saveCachedCategories,
  applyOfflineStockDecrement,
  addOfflineSale,
} from '../lib/offlineCache';
import { enqueueOfflineItem } from '../lib/offlineQueue';

const PRODUCTS_TABLE = 'products';

export type Category = string | 'todos';

/**
 * useProducts Hook
 * Fetches active products with offline-first fallback.
 */
export function useProducts(category: Category = 'todos') {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      if (!getIsOnline()) {
        const cached = await getCachedProducts();
        return cached;
      }

      try {
        const { data, error } = await supabase
          .from(PRODUCTS_TABLE)
          .select('*, product_categories(categories(name))')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        const formatted = (data ?? []).map((p: any) => ({
          ...p,
          categories:
            p.product_categories
              ?.map((pc: any) => pc.categories?.name)
              .filter(Boolean) ?? [],
        }));

        await saveCachedProducts(formatted);
        return formatted;
      } catch (err) {
        console.warn('[useProducts] Network request failed, reading from offline cache');
        return await getCachedProducts();
      }
    },
    select: (products) => {
      if (category === 'todos') return products;
      return products.filter((p) => p.categories?.includes(category));
    },
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
}

export function useCategories() {
  const setCategories = useSettingsStore((state) => state.setCategories);

  const query = useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<string[]> => {
      if (!getIsOnline()) {
        return await getCachedCategories();
      }

      try {
        const { data, error } = await supabase
          .from('categories')
          .select('name')
          .order('name');

        if (error) throw error;
        const categories = data.map((c) => c.name as string);
        await saveCachedCategories(categories);
        return categories;
      } catch (err) {
        return await getCachedCategories();
      }
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (query.data) setCategories(query.data);
  }, [query.data, setCategories]);

  return query;
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      totalAmount,
      paymentMethod,
      items,
      clientId,
      ivaEnabled,
      taxAmount,
      exchangeRate,
      totalAmountBs,
    }: {
      totalAmount: number;
      paymentMethod: 'cash' | 'card' | 'transfer' | 'credito';
      items: Array<{
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
      }>;
      clientId?: string;
      ivaEnabled?: boolean;
      taxAmount?: number;
      exchangeRate?: number;
      totalAmountBs?: number;
    }) => {
      const isOnline = getIsOnline();

      if (!isOnline) {
        return await processOfflineSale({
          totalAmount,
          paymentMethod,
          items,
          clientId,
          ivaEnabled,
          taxAmount,
          exchangeRate,
          totalAmountBs,
        });
      }

      try {
        // 1. Pre-checkout stock validation
        const productIds = items.map((i) => i.product_id);
        const { data: dbProducts, error: fetchError } = await supabase
          .from('products')
          .select('id, name, stock_quantity, cost')
          .in('id', productIds);

        if (fetchError) throw fetchError;

        for (const item of items) {
          const dbProduct = dbProducts?.find((p) => p.id === item.product_id);
          if (!dbProduct) {
            throw new Error(`Producto no encontrado: ${item.product_name}`);
          }
          if (dbProduct.stock_quantity < item.quantity) {
            throw new Error(
              `Stock insuficiente para ${dbProduct.name}. Disponible: ${dbProduct.stock_quantity}`
            );
          }
        }

        // 2. Insert sale
        const status = paymentMethod === 'credito' ? 'pending_payment' : 'paid';
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            total_amount: totalAmount,
            exchange_rate: exchangeRate || 1.0,
            total_amount_bs: totalAmountBs || totalAmount,
            payment_method: paymentMethod,
            client_id: clientId || null,
            status,
            iva_enabled: ivaEnabled || false,
            tax_amount: taxAmount || 0,
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // 3. Insert sale items
        const saleItems = items.map((item) => {
          const dbProduct = dbProducts?.find((p) => p.id === item.product_id);
          return {
            sale_id: sale.id,
            unit_cost: dbProduct?.cost || 0,
            ...item,
          };
        });

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) {
          await supabase.from('sales').delete().eq('id', sale.id);
          throw itemsError;
        }

        // 4. Decrement stock
        for (const item of items) {
          await supabase.rpc('decrement_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          });
        }

        return sale;
      } catch (err: any) {
        const isNetworkErr =
          err?.message?.includes('Network') ||
          err?.message?.includes('fetch') ||
          err?.status === 0;

        if (isNetworkErr) {
          console.warn('[useCreateSale] Online creation failed due to network, falling back to offline queue');
          return await processOfflineSale({
            totalAmount,
            paymentMethod,
            items,
            clientId,
            ivaEnabled,
            taxAmount,
          });
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      if (variables.paymentMethod === 'credito') {
        queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
        if (variables.clientId) {
          queryClient.invalidateQueries({
            queryKey: ['client_credit_sales', variables.clientId],
          });
        }
      }
    },
  });
}

async function processOfflineSale(payload: {
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credito';
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  clientId?: string;
  ivaEnabled?: boolean;
  taxAmount?: number;
  exchangeRate?: number;
  totalAmountBs?: number;
}) {
  const offlineSaleId = 'offline-' + Date.now();
  const status = payload.paymentMethod === 'credito' ? 'pending_payment' : 'paid';

  // 1. Enqueue action
  await enqueueOfflineItem('CREATE_SALE', {
    ...payload,
    offlineId: offlineSaleId,
  });

  // 2. Decrement local cached stock
  await applyOfflineStockDecrement(payload.items);

  // 3. Add to cached sales
  const offlineSale = {
    id: offlineSaleId,
    created_at: new Date().toISOString(),
    total_amount: payload.totalAmount,
    exchange_rate: payload.exchangeRate || 1.0,
    total_amount_bs: payload.totalAmountBs || payload.totalAmount,
    payment_method: payload.paymentMethod,
    client_id: payload.clientId || null,
    status,
    iva_enabled: payload.ivaEnabled || false,
    tax_amount: payload.taxAmount || 0,
    is_offline: true,
  };
  await addOfflineSale(offlineSale);

  return offlineSale;
}