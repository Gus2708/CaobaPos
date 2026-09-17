/**
 * Builds the folio shown on receipts, summaries and history rows.
 *
 * Persisted sales carry a Supabase UUID, whose first 8 characters are already
 * unique enough to read out loud. Offline and demo sales instead carry a
 * `temp-${Date.now()}` id: its first 8 characters are always "TEMP-17…",
 * so every temporary sale used to display the same folio. Taking the tail of
 * the timestamp keeps the "TEMP-" marker while making sales minted at
 * different milliseconds distinguishable.
 */
const TEMP_PREFIX = 'temp-';
const TEMP_SUFFIX_LENGTH = 6;
const FOLIO_LENGTH = 8;

export function formatFolio(saleId: string): string {
  if (!saleId) return '';

  if (saleId.startsWith(TEMP_PREFIX)) {
    const timestamp = saleId.slice(TEMP_PREFIX.length);
    return `TEMP-${timestamp.slice(-TEMP_SUFFIX_LENGTH)}`;
  }

  return saleId.slice(0, FOLIO_LENGTH).toUpperCase();
}
