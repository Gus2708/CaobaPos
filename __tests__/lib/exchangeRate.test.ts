import { formatBs, usdToBs, bsToUsd } from '../../hooks/useExchangeRate';
import {
  getCachedExchangeRate,
  saveCachedExchangeRate,
  DEFAULT_BCV_RATE,
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
      expect(rateData.source).toBe('bcv');
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
