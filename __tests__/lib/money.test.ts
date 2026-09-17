import { formatUsd, formatBs, formatRate, formatAmountInput, parseAmount } from '../../lib/money';

describe('formatUsd', () => {
  test('formats USD with dot thousands and comma decimals', () => {
    expect(formatUsd(1234.56)).toBe('$1.234,56');
    expect(formatUsd(0)).toBe('$0,00');
    expect(formatUsd(2.5)).toBe('$2,50');
    expect(formatUsd(1234567.891)).toBe('$1.234.567,89');
  });

  test('handles negative amounts', () => {
    expect(formatUsd(-1234.56)).toBe('-$1.234,56');
    expect(formatUsd(-2.5)).toBe('-$2,50');
  });

  test('handles NaN, null, and undefined', () => {
    expect(formatUsd(NaN)).toBe('$0,00');
    expect(formatUsd(null as any)).toBe('$0,00');
    expect(formatUsd(undefined as any)).toBe('$0,00');
  });

  test('always shows 2 decimal places', () => {
    expect(formatUsd(5)).toBe('$5,00');
    expect(formatUsd(0.1)).toBe('$0,10');
  });
});

describe('formatBs', () => {
  test('formats Bs with dot thousands and comma decimals', () => {
    expect(formatBs(1234.56)).toBe('Bs. 1.234,56');
    expect(formatBs(0)).toBe('Bs. 0,00');
    expect(formatBs(2.5)).toBe('Bs. 2,50');
    expect(formatBs(1234567.891)).toBe('Bs. 1.234.567,89');
  });

  test('handles negative amounts', () => {
    expect(formatBs(-1234.56)).toBe('Bs. -1.234,56');
    expect(formatBs(-2.5)).toBe('Bs. -2,50');
  });

  test('handles NaN, null, and undefined', () => {
    expect(formatBs(NaN)).toBe('Bs. 0,00');
    expect(formatBs(null as any)).toBe('Bs. 0,00');
    expect(formatBs(undefined as any)).toBe('Bs. 0,00');
  });

  test('always shows 2 decimal places', () => {
    expect(formatBs(5)).toBe('Bs. 5,00');
    expect(formatBs(0.1)).toBe('Bs. 0,10');
  });
});

describe('formatRate', () => {
  test('formats exchange rate with comma decimals and dot thousands', () => {
    expect(formatRate(65.5)).toBe('65,50');
    expect(formatRate(1234.56)).toBe('1.234,56');
    expect(formatRate(0)).toBe('0,00');
  });

  test('always shows 2 decimal places', () => {
    expect(formatRate(5)).toBe('5,00');
    expect(formatRate(0.1)).toBe('0,10');
  });

  test('handles large rates', () => {
    expect(formatRate(123456.789)).toBe('123.456,79');
  });
});

describe('formatAmountInput', () => {
  test('formats with comma decimals and no thousands separator', () => {
    expect(formatAmountInput(1234.56)).toBe('1234,56');
    expect(formatAmountInput(2.5)).toBe('2,50');
    expect(formatAmountInput(0)).toBe('0,00');
    expect(formatAmountInput(1234567.891)).toBe('1234567,89');
  });

  test('always shows 2 decimal places', () => {
    expect(formatAmountInput(5)).toBe('5,00');
    expect(formatAmountInput(0.1)).toBe('0,10');
  });

  test('handles negative amounts', () => {
    expect(formatAmountInput(-1234.56)).toBe('-1234,56');
  });
});

describe('parseAmount', () => {
  test('parses Venezuelan format with thousands dots and comma decimals', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1234,56')).toBe(1234.56);
    expect(parseAmount('2,5')).toBe(2.5);
    expect(parseAmount('2.50')).toBe(2.5);
  });

  test('parses numbers with only thousands separator', () => {
    expect(parseAmount('1.234')).toBe(1234);
    expect(parseAmount('12.345.678')).toBe(12345678);
  });

  test('removes currency symbols', () => {
    expect(parseAmount('Bs. 1.234,56')).toBe(1234.56);
    expect(parseAmount('bs. 1.234,56')).toBe(1234.56);
    expect(parseAmount('$ 2,50')).toBe(2.5);
    expect(parseAmount('$2,50')).toBe(2.5);
  });

  test('handles empty string and invalid input', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount('$')).toBe(0);
  });

  test('strips spaces', () => {
    expect(parseAmount('  1.234,56  ')).toBe(1234.56);
    expect(parseAmount('1 234,56')).toBe(1234.56);
  });

  test('handles negative amounts', () => {
    expect(parseAmount('-1.234,56')).toBe(-1234.56);
    expect(parseAmount('-$2,50')).toBe(-2.5);
  });
});
