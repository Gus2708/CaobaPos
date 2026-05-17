import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * useRealtimeSync
 *
 * Subscribes to Supabase Realtime channels for critical POS tables so that
 * all devices running the app stay in sync instantly. When any device makes
 * a sale, updates inventory, or modifies client data, the relevant query
 * caches are invalidated on every other device.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Channel for products table — stock changes from sales on other devices
    const productsChannel = supabase
      .channel('realtime-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
        }
      )
      .subscribe();

    // Channel for sales — new sales from other devices
    const salesChannel = supabase
      .channel('realtime-sales')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sales-history'], exact: false });
          queryClient.invalidateQueries({ queryKey: ['sales-history-total'], exact: false });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      )
      .subscribe();

    // Channel for client-related tables — payments and balance changes
    const clientsChannel = supabase
      .channel('realtime-clients')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_payments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
          queryClient.invalidateQueries({ queryKey: ['client_payments'] });
          queryClient.invalidateQueries({ queryKey: ['client_credit_sales'] });
        }
      )
      .subscribe();

    // Channel for categories — in case categories are added/removed
    const categoriesChannel = supabase
      .channel('realtime-categories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [queryClient]);
}
