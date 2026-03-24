'use client'

import { formatAmount } from '@packages/utils/currency'
import { Tooltip } from '@heroui/tooltip'

interface ConvertedAmountProps {
  /** The primary amount to display */
  amount: string | number | null | undefined
  /** Currency code (e.g., 'USD') */
  currencyCode?: string | null
  /** Currency symbol (e.g., 'US$') */
  currencySymbol?: string | null
  /** Whether this currency is the base currency */
  isBaseCurrency?: boolean
  /** Converted amount in base currency (Bs.) */
  amountInBaseCurrency?: string | null
  /** Exchange rate used for conversion */
  exchangeRateUsed?: string | null
  /** Base currency symbol (default: 'Bs.') */
  baseCurrencySymbol?: string
  /** Base currency code (default: 'VES') */
  baseCurrencyCode?: string
  /** Additional CSS class for the container */
  className?: string
}

/**
 * Displays an amount with an optional conversion indicator when the
 * currency differs from the base currency (VES).
 *
 * Example output: "38,00 USD ≈ Bs. 1.444,60"
 */
export function ConvertedAmount({
  amount,
  currencyCode,
  currencySymbol,
  isBaseCurrency,
  amountInBaseCurrency,
  exchangeRateUsed,
  baseCurrencySymbol = 'Bs.',
  baseCurrencyCode = 'VES',
  className,
}: ConvertedAmountProps) {
  const formattedAmount = formatAmount(amount)
  const label = currencySymbol || currencyCode || ''

  // No conversion needed if it's the base currency or no converted amount
  if (isBaseCurrency || !amountInBaseCurrency || !currencyCode) {
    return (
      <span className={className}>{label ? `${label} ${formattedAmount}` : formattedAmount}</span>
    )
  }

  const formattedConverted = formatAmount(amountInBaseCurrency)
  const conversionText = `${baseCurrencySymbol} ${formattedConverted}`

  const tooltipContent = exchangeRateUsed
    ? `Tasa: 1 ${currencyCode} = ${formatAmount(exchangeRateUsed, { maximumFractionDigits: 4 })} ${baseCurrencyCode}`
    : `Equivalente en ${baseCurrencyCode}`

  return (
    <Tooltip content={tooltipContent} delay={300} placement="top">
      <span className={`inline-flex flex-col ${className ?? ''}`}>
        <span>{label ? `${label} ${formattedAmount}` : formattedAmount}</span>
        <span className="text-xs text-default-400">≈ {conversionText}</span>
      </span>
    </Tooltip>
  )
}
