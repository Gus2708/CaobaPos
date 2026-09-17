import { formatFolio } from '../../lib/formatFolio';

describe('formatFolio', () => {
  it('takes the first 8 characters uppercased for a persisted UUID', () => {
    expect(formatFolio('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('A1B2C3D4');
  });

  it('keeps the TEMP- prefix and the last 6 characters for a temporary id', () => {
    expect(formatFolio('temp-1780000000000')).toBe('TEMP-000000');
  });

  it('produces different folios for two temporary sales created at different times', () => {
    const first = formatFolio('temp-1780000000001');
    const second = formatFolio('temp-1780000000002');
    expect(first).not.toBe(second);
  });

  it('does not throw on a short id and returns what it has', () => {
    expect(() => formatFolio('abc')).not.toThrow();
    expect(formatFolio('abc')).toBe('ABC');
  });

  it('does not throw on a temporary id shorter than the suffix window', () => {
    expect(() => formatFolio('temp-12')).not.toThrow();
    expect(formatFolio('temp-12')).toBe('TEMP-12');
  });

  it('does not throw on empty input', () => {
    expect(() => formatFolio('')).not.toThrow();
    expect(formatFolio('')).toBe('');
  });
});
