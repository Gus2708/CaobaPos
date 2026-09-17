import { formatBs, usdToBs, bsToUsd, isFallbackRate, isStaleRate } from '../../hooks/useExchangeRate';
import {
  getCachedExchangeRate,
  saveCachedExchangeRate,
  DEFAULT_BCV_RATE,
  FALLBACK_RATE_SOURCE,
} from '../../lib/offlineCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDemoStore } from '../../store/demoStore';

describe('Exchange Rate Utilities & Conversion', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('formatBs', () => {
    it('formats numbers with Venezuelan dot thousands and comma decimals', () => {
      expect(formatBs(1000)).toBe('Bs. 1.000,00');
      expect(formatBs(777.42)).toBe('Bs. 777,42');
      expect(formatBs(1234567.89)).toBe('Bs. 1.234.567,89');
      expect(formatBs(0)).toBe('Bs. 0,00');
    });

    it('handles null, undefined or NaN gracefully', () => {
      expect(formatBs(NaN)).toBe('Bs. 0,00');
      expect(formatBs(null as any)).toBe('Bs. 0,00');
      expect(formatBs(undefined as any)).toBe('Bs. 0,00');
    });
  });

  describe('usdToBs & bsToUsd conversion', () => {
    const rate = 777.4161;

    it('converts USD to VES accurately', () => {
      expect(usdToBs(10, rate)).toBe(7774.16);
      expect(usdToBs(0, rate)).toBe(0);
      expect(usdToBs(1.5, rate)).toBe(1166.12);
    });

    it('converts VES to USD accurately', () => {
      expect(bsToUsd(7774.16, rate)).toBe(10);
      expect(bsToUsd(0, rate)).toBe(0);
      expect(bsToUsd(1000, 0)).toBe(0);
    });
  });

  describe('offlineCache Exchange Rate', () => {
    it('returns DEFAULT_BCV_RATE when cache is empty', async () => {
      const rateData = await getCachedExchangeRate();
      expect(rateData.rate).toBe(DEFAULT_BCV_RATE.rate);
      expect(rateData.currency).toBe('USD_VES');
      expect(rateData.source).toBe(FALLBACK_RATE_SOURCE);
      expect(isFallbackRate(rateData)).toBe(true);
    });

    it('saves and retrieves custom cached exchange rate', async () => {
      const customRate = {
        currency: 'USD_VES',
        source: 'bcv',
        rate: 800.50,
        updated_at: new Date().toISOString(),
      };
      await saveCachedExchangeRate(customRate);
      const retrieved = await getCachedExchangeRate();
      expect(retrieved.rate).toBe(800.50);
    });
  });
});

describe('demo exchange rate follows the live BCV rate', () => {
  beforeEach(() => {
    useDemoStore.setState({ demoExchangeRate: DEFAULT_BCV_RATE.rate });
    useDemoStore.getState().resetDemoData();
  });

  it('reprices the seeded demo sales when the live rate arrives', () => {
    const seeded = useDemoStore.getState().demoSales[0];
    useDemoStore.getState().syncDemoExchangeRate(842);

    const state = useDemoStore.getState();
    expect(state.demoExchangeRate).toBe(842);
    expect(state.demoSales[0].exchange_rate).toBe(842);
    expect(state.demoSales[0].total_amount_bs).toBe(Number((seeded.total_amount * 842).toFixed(2)));
  });

  it('keeps the current rate when the live value is missing or invalid', () => {
    const before = useDemoStore.getState().demoExchangeRate;
    useDemoStore.getState().syncDemoExchangeRate(0);
    useDemoStore.getState().syncDemoExchangeRate(NaN);
    useDemoStore.getState().syncDemoExchangeRate(-5);
    expect(useDemoStore.getState().demoExchangeRate).toBe(before);
  });
});

describe('rate confidence helpers', () => {
  const now = Date.parse('2026-09-17T12:00:00.000Z');
  const rateAt = (updatedAt: string, source = 'bcv') => ({
    currency: 'USD_VES',
    source,
    rate: 842,
    updated_at: updatedAt,
  });

  it('treats the built-in fallback as unconfirmed', () => {
    expect(isFallbackRate(DEFAULT_BCV_RATE)).toBe(true);
    expect(isStaleRate(DEFAULT_BCV_RATE, now)).toBe(true);
  });

  it('trusts a BCV rate synced within the last day', () => {
    const fresh = rateAt(new Date(now - 1000 * 60 * 30).toISOString());
    expect(isFallbackRate(fresh)).toBe(false);
    expect(isStaleRate(fresh, now)).toBe(false);
  });

  it('flags a BCV rate older than a day', () => {
    expect(isStaleRate(rateAt(new Date(now - 1000 * 60 * 60 * 30).toISOString()), now)).toBe(true);
  });

  it('keeps trusting a manual rate the cashier set', () => {
    expect(isStaleRate(rateAt(new Date(now - 1000 * 60 * 60 * 72).toISOString(), 'manual'), now)).toBe(false);
  });

  it('flags a broken timestamp', () => {
    expect(isStaleRate(rateAt('not-a-date'), now)).toBe(true);
  });
});
