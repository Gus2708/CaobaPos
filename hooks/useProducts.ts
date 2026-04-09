import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Product } from '../store/cartStore';
import { useCartStore } from '../store/cartStore';

const PRODUCTS_TABLE = 'products';

export type Category = string | 'todos';

export function useProducts(category: Category = 'todos') {
  return useQuery({
    queryKey: ['products', category],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select('*, product_categories(categories(name))')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      const productsWithCategories = (data ?? []).map((p: any) => ({
        ...p,
        categories: p.product_categories?.map((pc: any) => pc.categories?.name).filter(Boolean) || []
      }));
      
      if (category !== 'todos' && category !== 'todos') {
        return productsWithCategories.filter((p: Product) => 
          p.categories?.includes(category)
        );
      }
      
      return productsWithCategories;
    },
    staleTime: 1000 * 60,
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
    }: {
      totalAmount: number;
      paymentMethod: 'cash' | 'card' | 'transfer';
      items: Array<{
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
      }>;
    }) => {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          total_amount: totalAmount,
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = items.map((item) => ({
        sale_id: sale.id,
        ...item,
      }));

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      clearCart();
    },
  });
}