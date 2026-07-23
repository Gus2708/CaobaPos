import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getIsOnline } from '../lib/networkStatus';
import {
  getCachedClients,
  saveCachedClients,
  addOfflineClient,
  addOfflinePayment,
} from '../lib/offlineCache';
import { enqueueOfflineItem } from '../lib/offlineQueue';

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
      if (!getIsOnline()) {
        return await getCachedClients();
      }

      try {
        const { data, error } = await supabase
          .from('client_balances')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        const clients = data || [];
        await saveCachedClients(clients);
        return clients;
      } catch (err) {
        console.warn('[useClients] Network failed, using offline cache');
        return await getCachedClients();
      }
    },
    staleTime: 1000 * 30,
  });
}

export function useClientPayments(clientId: string | null) {
  return useQuery({
    queryKey: ['client_payments', clientId],
    queryFn: async (): Promise<ClientPayment[]> => {
      if (!clientId) return [];
      if (!getIsOnline()) return [];

      try {
        const { data, error } = await supabase
          .from('client_payments')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        return [];
      }
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
      if (!getIsOnline()) return [];

      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*, sale_items(*)')
          .eq('client_id', clientId)
          .eq('payment_method', 'credito')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!clientId,
    staleTime: 1000 * 60,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone?: string }) => {
      if (!getIsOnline()) {
        const tempId = 'offline-' + Date.now();
        await enqueueOfflineItem('CREATE_CLIENT', { tempId, name, phone });

        const offlineClient: ClientBalance = {
          id: tempId,
          name,
          phone: phone || null,
          created_at: new Date().toISOString(),
          total_credit_sales: 0,
          total_paid: 0,
          balance_due: 0,
          is_active: true,
        };
        await addOfflineClient(offlineClient);
        return offlineClient;
      }

      try {
        const { data, error } = await supabase
          .from('clients')
          .insert({ name, phone })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err: any) {
        const isNetworkErr =
          err?.message?.includes('Network') ||
          err?.message?.includes('fetch') ||
          err?.status === 0;

        if (isNetworkErr) {
          const tempId = 'offline-' + Date.now();
          await enqueueOfflineItem('CREATE_CLIENT', { tempId, name, phone });

          const offlineClient: ClientBalance = {
            id: tempId,
            name,
            phone: phone || null,
            created_at: new Date().toISOString(),
            total_credit_sales: 0,
            total_paid: 0,
            balance_due: 0,
            is_active: true,
          };
          await addOfflineClient(offlineClient);
          return offlineClient;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      amount,
      paymentMethod,
      saleId,
    }: {
      clientId: string;
      amount: number;
      paymentMethod: string;
      saleId?: string;
    }) => {
      if (!getIsOnline()) {
        await enqueueOfflineItem('ADD_PAYMENT', {
          clientId,
          amount,
          paymentMethod,
          saleId,
        });
        await addOfflinePayment(clientId, amount);
        return {
          id: 'offline-' + Date.now(),
          client_id: clientId,
          sale_id: saleId || null,
          amount,
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
        };
      }

      try {
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
      } catch (err: any) {
        const isNetworkErr =
          err?.message?.includes('Network') ||
          err?.message?.includes('fetch') ||
          err?.status === 0;

        if (isNetworkErr) {
          await enqueueOfflineItem('ADD_PAYMENT', {
            clientId,
            amount,
            paymentMethod,
            saleId,
          });
          await addOfflinePayment(clientId, amount);
          return {
            id: 'offline-' + Date.now(),
            client_id: clientId,
            sale_id: saleId || null,
            amount,
            payment_method: paymentMethod,
            created_at: new Date().toISOString(),
          };
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
      queryClient.invalidateQueries({
        queryKey: ['client_payments', variables.clientId],
      });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      clientId,
    }: {
      paymentId: string;
      clientId: string;
    }) => {
      const { error } = await supabase
        .from('client_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
      queryClient.invalidateQueries({
        queryKey: ['client_payments', variables.clientId],
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      if (!getIsOnline()) {
        await enqueueOfflineItem('DELETE_CLIENT', { id: clientId });
        return;
      }
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
