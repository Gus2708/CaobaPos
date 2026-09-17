/**
 * Venezuelan currency formatting and parsing library.
 * Handles USD ($1.234,56), Bolivars (Bs. 1.234,56), and exchange rates (65,50).
 */

/**
 * Formats USD amount to Venezuelan format: $1.234,56
 * - Dot (.) for thousands separator
 * - Comma (,) for decimal separator
 * - Always 2 decimal places
 */
export function formatUsd(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$0,00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const parts = absAmount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];

  const formatted = `$${intPart},${decPart}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats Bolivars amount to Venezuelan format: Bs. 1.234,56
 * - Dot (.) for thousands separator
 * - Comma (,) for decimal separator
 * - Always 2 decimal places
 */
export function formatBs(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Bs. 0,00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const parts = absAmount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];

  const formatted = `Bs. ${intPart},${decPart}`;
  return isNegative ? `Bs. -${intPart},${decPart}` : formatted;
}

/**
 * Formats exchange rate to Venezuelan format: 65,50
 * - Dot (.) for thousands separator
 * - Comma (,) for decimal separator
 * - Always 2 decimal places
 */
export function formatRate(rate: number): string {
  if (isNaN(rate) || rate === null || rate === undefined) {
    return '0,00';
  }

  const parts = Number(rate).toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  return `${intPart},${decPart}`;
}

/**
 * Formats amount for input fields (no thousands separator):
 * 1234,56 or 1234567,89
 * - Comma (,) for decimal separator
 * - No thousands separator
 * - Always 2 decimal places
 */
export function formatAmountInput(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0,00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const parts = absAmount.toFixed(2).split('.');
  const decPart = parts[1];

  const formatted = `${parts[0]},${decPart}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parses Venezuelan format input string to number.
 * Handles:
 * - Thousands separator (dot): 1.234,56 → 1234.56
 * - Decimals (comma): 1.234,56 → 1234.56
 * - Currency symbols: $ or Bs./bs. (case-insensitive)
 * - Spaces are stripped
 * - Negative amounts: -1.234,56
 *
 * Returns 0 for empty, invalid, or NaN input.
 */
export function parseAmount(input: string): number {
  if (!input || typeof input !== 'string') {
    return 0;
  }

  // Strip spaces
  let cleaned = input.trim().replace(/\s/g, '');

  // Determine if negative (check before removing symbols)
  const isNegative = cleaned.startsWith('-');
  if (isNegative) {
    cleaned = cleaned.substring(1);
  }

  // Remove currency symbols and prefix (case-insensitive)
  // Remove Bs. or bs.
  cleaned = cleaned.replace(/^bs\.?/i, '');
  // Remove leading $
  cleaned = cleaned.replace(/^\$/, '');
  // Trim spaces again after symbol removal
  cleaned = cleaned.trim();

  if (!cleaned) {
    return 0;
  }

  // Parse the number:
  // If it contains a comma, it's the decimal separator:
  // Remove all dots (thousands), convert comma to dot for parseFloat
  if (cleaned.includes(',')) {
    // "1.234,56" → remove dots → "1234,56" → convert comma to dot → "1234.56"
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.')) {
    // If only dots and either:
    // - more than one dot (thousands separators), OR
    // - exactly 3 digits follow the last dot (it's thousands, not decimals)
    const lastDotIndex = cleaned.lastIndexOf('.');
    const afterLastDot = cleaned.substring(lastDotIndex + 1);

    if (cleaned.indexOf('.') !== lastDotIndex) {
      // More than one dot → remove all dots
      cleaned = cleaned.replace(/\./g, '');
    } else if (afterLastDot.length !== 3) {
      // Single dot but NOT 3 digits after → it's the decimal separator, do nothing
      // Single dot with exactly 3 digits after → it's thousands, remove it
    } else {
      // Single dot with exactly 3 digits after → it's thousands separator
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const num = parseFloat(cleaned);
  const result = isNaN(num) ? 0 : num;
  return isNegative ? -result : result;
}
