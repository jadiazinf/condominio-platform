export type TCurrencyInput = number | string | null | undefined

export interface FormatCurrencyOptions {
  locale?: string
  currency?: string
}

export interface FormatAmountOptions {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

/**
 * Formats a number as a full currency string with symbol and locale-aware separators.
 * e.g., formatCurrency(1234.5) → "US$\u00a01.234,50" (es-VE/USD)
 */
export function formatCurrency(
  amount: TCurrencyInput,
  options: FormatCurrencyOptions = {}
): string {
  const { locale = 'es-VE', currency = 'USD' } = options

  if (amount === null || amount === undefined) return formatCurrency(0, options)

  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return formatCurrency(0, options)

  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num)
}

/**
 * Formats a number with locale-aware decimal separators, without a currency symbol.
 * e.g., formatAmount(1234.5) → "1.234,50" (es-VE)
 */
export function formatAmount(
  amount: TCurrencyInput,
  options: FormatAmountOptions = {}
): string {
  const { locale = 'es-VE', minimumFractionDigits = 2, maximumFractionDigits = 2 } = options

  if (amount === null || amount === undefined) return formatAmount(0, options)

  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return formatAmount(0, options)

  return num.toLocaleString(locale, { minimumFractionDigits, maximumFractionDigits })
}
