import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getIsOnline } from '../lib/networkStatus';
import {
  getCachedExchangeRate,
  saveCachedExchangeRate,
  DEFAULT_BCV_RATE,
  FALLBACK_RATE_SOURCE,
  CachedExchangeRate,
} from '../lib/offlineCache';
import { isDemoActive, useDemoStore } from '../store/demoStore';
import { formatBs } from '../lib/money';

const EXCHANGE_RATES_TABLE = 'exchange_rates';
const DOLAR_API_BCV_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

// Re-export formatBs from lib/money for backward compatibility
export { formatBs } from '../lib/money';

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

/** The BCV rate syncs hourly, so a day without an update means something is wrong. */
export const RATE_STALE_AFTER_MS = 1000 * 60 * 60 * 24;

/** True when the rate on screen is the built-in fallback, never confirmed against the BCV. */
export function isFallbackRate(rateData?: CachedExchangeRate | null): boolean {
  return !rateData || rateData.source === FALLBACK_RATE_SOURCE;
}

/**
 * True when the rate should not be trusted for pricing: the fallback, a reading older
 * than a day, or a broken timestamp. Manual rates are set by the cashier and demo rates
 * are sandbox data, so neither goes stale.
 */
export function isStaleRate(rateData?: CachedExchangeRate | null, now: number = Date.now()): boolean {
  if (isFallbackRate(rateData) || !rateData) return true;
  if (rateData.source === 'manual' || rateData.source === 'demo') return false;
  const updatedAt = Date.parse(rateData.updated_at);
  if (isNaN(updatedAt)) return true;
  return now - updatedAt > RATE_STALE_AFTER_MS;
}

// --- Module-level singleton for Realtime subscription ---
// Prevents duplicate WebSocket channels when many components call useExchangeRate()
let realtimeInitialized = false;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function ensureRealtimeSubscription(queryClient: ReturnType<typeof useQueryClient>) {
  if (realtimeInitialized) return;
  realtimeInitialized = true;

  try {
    realtimeChannel = supabase
      .channel('exchange_rates_singleton')
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
  } catch (err) {
    console.warn('[useExchangeRate] Realtime subscription failed:', err);
    realtimeInitialized = false;
  }
}

/**
 * useExchangeRate Hook
 * Retrieves the current official BCV exchange rate from Supabase
 * with Realtime updates and offline fallback.
 */
export function useExchangeRate() {
  const queryClient = useQueryClient();
  const isDemo = useDemoStore((s) => s.isDemoMode);
  const demoRate = useDemoStore((s) => s.demoExchangeRate);

  const query = useQuery({
    queryKey: ['exchange_rate', 'current', isDemo],
    queryFn: async (): Promise<CachedExchangeRate> => {
      if (isDemoActive()) {
        // Demo mode reads the live BCV rate so bolivar amounts match the real ones.
        if (getIsOnline()) {
          try {
            const { data, error } = await supabase
              .from(EXCHANGE_RATES_TABLE)
              .select('*')
              .eq('currency', 'USD_VES')
              .eq('is_current', true)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!error && data?.rate) {
              const liveRate = Number(data.rate);
              useDemoStore.getState().syncDemoExchangeRate(liveRate);
              return {
                id: 'demo-rate',
                currency: 'USD_VES',
                source: 'demo',
                rate: liveRate,
                updated_at: data.updated_at || new Date().toISOString(),
              };
            }
          } catch {
            // Fall back to the rate the demo already holds.
          }
        }

        return {
          id: 'demo-rate',
          currency: 'USD_VES',
          source: 'demo',
          rate: demoRate,
          updated_at: new Date().toISOString(),
        };
      }

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
    retry: false, // Don't retry if table doesn't exist
    placeholderData: (prev) => prev || DEFAULT_BCV_RATE,
  });

  // Initialize singleton Realtime subscription (safe to call multiple times)
  useEffect(() => {
    if (!isDemoActive()) {
      ensureRealtimeSubscription(queryClient);
    }
  }, [queryClient, isDemo]);

  const rateData = query.data || DEFAULT_BCV_RATE;
  const activeRate = rateData.rate || DEFAULT_BCV_RATE.rate;

  return {
    ...query,
    rate: activeRate,
    rateData,
    isFallbackRate: isFallbackRate(rateData),
    isRateUnconfirmed: !query.isLoading && !query.isPlaceholderData && isStaleRate(rateData),
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
      if (isDemoActive()) {
        try {
          const { data } = await supabase
            .from(EXCHANGE_RATES_TABLE)
            .select('*')
            .eq('currency', 'USD_VES')
            .eq('is_current', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data?.rate) {
            useDemoStore.getState().syncDemoExchangeRate(Number(data.rate));
          }
        } catch {
          // Keep the rate the demo already holds.
        }

        const rate = useDemoStore.getState().demoExchangeRate;
        return {
          id: 'demo-rate',
          currency: 'USD_VES',
          source: 'demo',
          rate,
          updated_at: new Date().toISOString(),
        };
      }

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

      if (isDemoActive()) {
        useDemoStore.setState({ demoExchangeRate: newRate });
        const cached: CachedExchangeRate = {
          id: 'demo-rate',
          currency: 'USD_VES',
          source: 'manual',
          rate: newRate,
          updated_at: new Date().toISOString(),
          raw_payload: { manual: true },
        };
        return cached;
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
