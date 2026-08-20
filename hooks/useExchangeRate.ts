import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getIsOnline } from '../lib/networkStatus';
import {
  getCachedExchangeRate,
  saveCachedExchangeRate,
  DEFAULT_BCV_RATE,
  CachedExchangeRate,
} from '../lib/offlineCache';

const EXCHANGE_RATES_TABLE = 'exchange_rates';
const DOLAR_API_BCV_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

/**
 * Venezuelan currency formatter (e.g. "Bs. 1.234,56")
 */
export function formatBs(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Bs. 0,00';
  }
  const parts = Number(amount).toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  return `Bs. ${intPart},${decPart}`;
}

/**
 * Converts USD amount to Bolivars (VES)
 */
export function usdToBs(amountUsd: number, rate: number): number {
  if (!amountUsd || !rate) return 0;
  return Number((amountUsd * rate).toFixed(2));
}

/**
 * Converts Bolivars (VES) amount to USD
 */
export function bsToUsd(amountBs: number, rate: number): number {
  if (!amountBs || !rate || rate === 0) return 0;
  return Number((amountBs / rate).toFixed(2));
}

/**
 * useExchangeRate Hook
 * Retrieves the current official BCV exchange rate from Supabase
 * with Realtime updates and offline fallback.
 */
export function useExchangeRate() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['exchange_rate', 'current'],
    queryFn: async (): Promise<CachedExchangeRate> => {
      if (!getIsOnline()) {
        return await getCachedExchangeRate();
      }

      try {
        const { data, error } = await supabase
          .from(EXCHANGE_RATES_TABLE)
          .select('*')
          .eq('currency', 'USD_VES')
          .eq('is_current', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data && data.rate) {
          const formatted: CachedExchangeRate = {
            id: data.id,
            currency: data.currency,
            source: data.source || 'bcv',
            rate: Number(data.rate),
            updated_at: data.updated_at || new Date().toISOString(),
            raw_payload: data.raw_payload,
          };
          await saveCachedExchangeRate(formatted);
          return formatted;
        }

        // If no record found in DB, fallback to cache or default
        return await getCachedExchangeRate();
      } catch (err) {
        console.warn('[useExchangeRate] Failed to fetch rate from Supabase, using cache');
        return await getCachedExchangeRate();
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    placeholderData: (prev) => prev || DEFAULT_BCV_RATE,
  });

  // Realtime subscription for automatic rate updates across devices
  useEffect(() => {
    const channel = supabase
      .channel('public:exchange_rates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: EXCHANGE_RATES_TABLE,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['exchange_rate', 'current'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const activeRate = query.data?.rate || DEFAULT_BCV_RATE.rate;

  return {
    ...query,
    rate: activeRate,
    rateData: query.data || DEFAULT_BCV_RATE,
    formatBs: (usdAmount: number) => formatBs(usdToBs(usdAmount, activeRate)),
    formatBsDirect: (bsAmount: number) => formatBs(bsAmount),
    toBs: (usdAmount: number) => usdToBs(usdAmount, activeRate),
    toUsd: (bsAmount: number) => bsToUsd(bsAmount, activeRate),
  };
}

/**
 * Mutation to force fetch current BCV rate from DolarAPI and save to Supabase
 */
export function useSyncBcvRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(DOLAR_API_BCV_URL);
      if (!response.ok) {
        throw new Error(`DolarAPI respondió con error ${response.status}`);
      }

      const payload = await response.json();
      const bcvRate = Number(payload.promedio || payload.venta || payload.compra);

      if (!bcvRate || isNaN(bcvRate) || bcvRate <= 0) {
        throw new Error('No se pudo obtener un valor de tasa válido de la API.');
      }

      // Try saving directly via RPC function or update/insert
      try {
        const { error: rpcError } = await supabase.rpc('update_exchange_rate', {
          p_rate: bcvRate,
          p_source: 'bcv',
          p_payload: payload,
        });

        if (rpcError) {
          // Fallback if RPC is not deployed yet: manual update + insert
          await supabase
            .from(EXCHANGE_RATES_TABLE)
            .update({ is_current: false })
            .eq('currency', 'USD_VES')
            .eq('is_current', true);

          await supabase.from(EXCHANGE_RATES_TABLE).insert({
            currency: 'USD_VES',
            source: 'bcv',
            rate: bcvRate,
            raw_payload: payload,
            is_current: true,
          });
        }
      } catch (dbErr) {
        console.warn('[useSyncBcvRate] DB write failed, saving locally in cache:', dbErr);
      }

      const cached: CachedExchangeRate = {
        currency: 'USD_VES',
        source: 'bcv',
        rate: bcvRate,
        updated_at: new Date().toISOString(),
        raw_payload: payload,
      };
      await saveCachedExchangeRate(cached);

      return cached;
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(['exchange_rate', 'current'], newData);
      queryClient.invalidateQueries({ queryKey: ['exchange_rate', 'current'] });
    },
  });
}

/**
 * Mutation to manually set the exchange rate (contingency mode)
 */
export function useUpdateManualRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newRate: number) => {
      if (!newRate || isNaN(newRate) || newRate <= 0) {
        throw new Error('La tasa debe ser un número mayor a cero.');
      }

      try {
        const { error: rpcError } = await supabase.rpc('update_exchange_rate', {
          p_rate: newRate,
          p_source: 'manual',
          p_payload: { source: 'manual', date: new Date().toISOString() },
        });

        if (rpcError) {
          await supabase
            .from(EXCHANGE_RATES_TABLE)
            .update({ is_current: false })
            .eq('currency', 'USD_VES')
            .eq('is_current', true);

          await supabase.from(EXCHANGE_RATES_TABLE).insert({
            currency: 'USD_VES',
            source: 'manual',
            rate: newRate,
            raw_payload: { manual: true },
            is_current: true,
          });
        }
      } catch (dbErr) {
        console.warn('[useUpdateManualRate] DB write failed, saving locally:', dbErr);
      }

      const cached: CachedExchangeRate = {
        currency: 'USD_VES',
        source: 'manual',
        rate: newRate,
        updated_at: new Date().toISOString(),
        raw_payload: { manual: true },
      };
      await saveCachedExchangeRate(cached);

      return cached;
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(['exchange_rate', 'current'], newData);
      queryClient.invalidateQueries({ queryKey: ['exchange_rate', 'current'] });
    },
  });
}
