/**
 * Cent-based financial math utilities.
 *
 * All monetary values in the DB are DECIMAL(15,2) stored as strings.
 * These helpers centralise the parseFloat → math → toFixed(2) pattern
 * and eliminate floating-point drift by operating in integer cents
 * wherever possible.
 */

/**
 * Parse a decimal string (or number/null/undefined) to a plain number.
 * Returns 0 for null, undefined, empty string, or NaN.
 */
export function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const n = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(n) ? 0 : n
}

/**
 * Round a number to 2 decimal places using banker-safe integer math.
 * e.g. roundCurrency(10.005) → 10.01
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Format a number as a 2-decimal string suitable for DB storage.
 * e.g. toDecimal(150) → "150.00"
 */
export function toDecimal(amount: number): string {
  return roundCurrency(amount).toFixed(2)
}

/**
 * Convert a decimal value to integer cents.
 * e.g. toCents("150.25") → 15025
 */
export function toCents(value: string | number): number {
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Math.round(n * 100)
}

/**
 * Convert integer cents back to a 2-decimal string.
 * e.g. fromCents(15025) → "150.25"
 */
export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * Sum any number of decimal string/number values, returning a number.
 * Nulls and undefined are treated as 0.
 */
export function sumAmounts(...values: (string | number | null | undefined)[]): number {
  return values.reduce<number>((sum, v) => sum + parseAmount(v), 0)
}
