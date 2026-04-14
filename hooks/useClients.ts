import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface ClientBalance extends Client {
  total_credit_sales: number;
  total_paid: number;
  balance_due: number;
  is_active: boolean;
}

export interface ClientPayment {
  id: string;
  client_id: string;
  sale_id: string | null;
  amount: number;
  payment_method: string;
  created_at: string;
}

export function useClients() {
  return useQuery({
    queryKey: ['clients_balances'],
    queryFn: async (): Promise<ClientBalance[]> => {
      // Usar la vista generada client_balances para obtener a los clientes junto con su deuda actual
      const { data, error } = await supabase
        .from('client_balances')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      return data || [];
    },
    staleTime: 1000 * 30, // 30 segundos
  });
}

export function useClientPayments(clientId: string | null) {
  return useQuery({
    queryKey: ['client_payments', clientId],
    queryFn: async (): Promise<ClientPayment[]> => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!clientId,
    staleTime: 1000 * 60,
  });
}

export function useClientCreditSales(clientId: string | null) {
  return useQuery({
    queryKey: ['client_credit_sales', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('client_id', clientId)
        .eq('payment_method', 'credito')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!clientId,
    staleTime: 1000 * 60,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone?: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ name, phone })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, amount, paymentMethod, saleId }: { clientId: string; amount: number; paymentMethod: string; saleId?: string }) => {
      const { data, error } = await supabase
        .from('client_payments')
        .insert({
          client_id: clientId,
          sale_id: saleId || null,
          amount,
          payment_method: paymentMethod,
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
      queryClient.invalidateQueries({ queryKey: ['client_payments', variables.clientId] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, clientId }: { paymentId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_payments')
        .delete()
        .eq('id', paymentId);
        
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
      queryClient.invalidateQueries({ queryKey: ['client_payments', variables.clientId] });
    },
  });
}
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', clientId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
    },
  });
}
