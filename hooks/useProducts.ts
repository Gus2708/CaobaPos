import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Product, useSettingsStore } from '../store/cartStore';
import { useCartStore } from '../store/cartStore';

const PRODUCTS_TABLE = 'products';

export type Category = string | 'todos';

/**
 * useProducts Hook
 * Fetches all active products once and caches them.
 * Filtering is done client-side for maximum performance and zero latency when switching categories.
 */
export function useProducts(category: Category = 'todos') {
  return useQuery({
    queryKey: ['products'], // Stable key to avoid redundant fetches
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select('*, product_categories(categories(name))')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data ?? []).map((p: any) => ({
        ...p,
        categories:
          p.product_categories
            ?.map((pc: any) => pc.categories?.name)
            .filter(Boolean) ?? [],
      }));
    },
    // Transform data based on category
    select: (products) => {
      if (category === 'todos') return products;
      return products.filter((p) => p.categories?.includes(category));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (prev) => prev,
  });
}

export function useCategories() {
  const setCategories = useSettingsStore((state) => state.setCategories);

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('name');

      if (error) throw error;
      
      const names = data.map(c => c.name);
      // Sync with store - wrap in timeout to avoid state updates during render
      setTimeout(() => setCategories(names), 0);
      return names;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const clearCart = useCartStore((state) => state.clearCart);

  return useMutation({
    mutationFn: async ({
      totalAmount,
      paymentMethod,
      items,
      clientId,
      ivaEnabled,
      taxAmount,
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
    }) => {
      // 1. Pre-checkout Stock Validation
      const productIds = items.map(i => i.product_id);
      const { data: dbProducts, error: fetchError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, cost')
        .in('id', productIds);

      if (fetchError) throw fetchError;

      for (const item of items) {
        const dbProduct = dbProducts?.find(p => p.id === item.product_id);
        if (!dbProduct) {
          throw new Error(`Producto no encontrado: ${item.product_name}`);
        }
        if (dbProduct.stock_quantity < item.quantity) {
          throw new Error(`Stock insuficiente para ${dbProduct.name}. Disponible: ${dbProduct.stock_quantity}`);
        }
      }

      // 2. Proceed with sale creation
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

      const saleItems = items.map((item) => {
        const dbProduct = dbProducts?.find(p => p.id === item.product_id);
        return {
          sale_id: sale.id,
          unit_cost: dbProduct?.cost || 0,
          ...item,
        };
      });

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      for (const item of items) {
        const { error: stockError } = await supabase.rpc('decrement_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });

        if (stockError) {
          console.warn('Stock decrement failed:', stockError);
        }
      }

      return sale;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      if (variables.paymentMethod === 'credito') {
        queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
        if (variables.clientId) {
          queryClient.invalidateQueries({ queryKey: ['client_credit_sales', variables.clientId] });
        }
      }
      clearCart();
    },
  });
}