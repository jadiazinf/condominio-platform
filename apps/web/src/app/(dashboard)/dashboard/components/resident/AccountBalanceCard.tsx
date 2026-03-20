import { TrendingUp } from 'lucide-react'

import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'

interface ICurrencySummary {
  code: string
  symbol: string
  pending: number
  dueThisMonth: number
}

interface IExchangeRateInfo {
  fromCode: string
  toCode: string
  rate: number
  effectiveDate: string
}

interface AccountBalanceCardProps {
  currencySummaries: ICurrencySummary[]
  exchangeRates: IExchangeRateInfo[]
  translations: {
    totalPending: string
    dueThisMonth: string
    upToDate: string
    payNow: string
    exchangeRates: string
    updatedAt: string
  }
}

function formatAmountES(amount: number, symbol: string): string {
  return `${symbol} ${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatRate(rate: number): string {
  return rate.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function convertAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: IExchangeRateInfo[]
): number | null {
  if (fromCode === toCode) return amount
  const direct = rates.find(r => r.fromCode === fromCode && r.toCode === toCode)

  if (direct) return amount * direct.rate
  const inverse = rates.find(r => r.fromCode === toCode && r.toCode === fromCode)

  if (inverse && inverse.rate !== 0) return amount / inverse.rate

  return null
}

export function AccountBalanceCard({
  currencySummaries,
  exchangeRates,
  translations: t,
}: AccountBalanceCardProps) {
  const totalAllCurrencies = currencySummaries.reduce((sum, c) => sum + c.pending, 0)
  const isAllPaid = totalAllCurrencies === 0

  // Get the latest rate date
  const latestDate = exchangeRates[0]?.effectiveDate
  const formattedDate = latestDate
    ? new Date(latestDate + 'T00:00:00').toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  // Build equivalent amounts in currencies not already in summaries
  const existingCodes = new Set(currencySummaries.map(c => c.code))
  const equivalents = ['USD', 'EUR']
    .filter(c => !existingCodes.has(c))
    .map(target => {
      let totalInTarget = 0
      let hasData = false

      for (const summary of currencySummaries) {
        if (summary.pending === 0) continue
        const converted = convertAmount(summary.pending, summary.code, target, exchangeRates)

        if (converted !== null) {
          totalInTarget += converted
          hasData = true
        }
      }
      const targetSymbol = target === 'USD' ? '$' : '€'

      return { code: target, symbol: targetSymbol, total: totalInTarget, hasData }
    })
    .filter(e => e.hasData)

  if (isAllPaid) {
    return (
      <Card className="h-full relative overflow-hidden bg-gradient-to-br from-success-900/20 via-success-800/10 to-transparent">
        <CardBody className="flex items-center justify-center p-5">
          <Chip
            classNames={{
              base: 'bg-success-100 dark:bg-success-900/30 px-4 py-2',
              content: 'text-success-700 dark:text-success-400 font-medium text-base',
            }}
            size="lg"
          >
            {t.upToDate}
          </Chip>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="h-full relative overflow-hidden shadow-lg border border-emerald-500/10 dark:border-emerald-400/10">
      {/* Layered gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15 dark:via-emerald-400/5 dark:to-transparent" />
      {/* Radial glow top-right */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-emerald-400/10 via-emerald-300/5 to-transparent dark:from-emerald-400/12 rounded-full -translate-y-1/3 translate-x-1/4 blur-2xl" />
      {/* Radial glow bottom-left */}
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-emerald-500/8 via-teal-400/5 to-transparent dark:from-emerald-500/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-xl" />
      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      {/* Decorative geometric shapes */}
      <svg
        className="absolute top-3 right-4 text-emerald-500/[0.06] dark:text-emerald-400/[0.08]"
        fill="none"
        height="120"
        viewBox="0 0 120 120"
        width="120"
      >
        <rect height="40" rx="8" stroke="currentColor" strokeWidth="1.5" width="40" x="10" y="10" />
        <rect height="40" rx="8" stroke="currentColor" strokeWidth="1" width="40" x="30" y="30" />
        <circle cx="90" cy="30" r="20" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="90" cy="30" r="12" stroke="currentColor" strokeWidth="1" />
        <line stroke="currentColor" strokeWidth="1.5" x1="60" x2="110" y1="90" y2="90" />
        <line stroke="currentColor" strokeWidth="1" x1="70" x2="110" y1="100" y2="100" />
        <line stroke="currentColor" strokeWidth="1" x1="80" x2="110" y1="110" y2="110" />
      </svg>
      {/* Decorative corner arcs */}
      <svg
        className="absolute bottom-2 left-3 text-emerald-500/[0.05] dark:text-emerald-400/[0.07]"
        fill="none"
        height="80"
        viewBox="0 0 80 80"
        width="80"
      >
        <path d="M5 75 Q5 5 75 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M15 75 Q15 15 75 15" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M25 75 Q25 25 75 25" fill="none" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      {/* Subtle inner highlight line at top */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
      <CardBody className="relative p-5 h-full flex flex-col gap-4">
        {/* Top row: balances + equivalents side by side */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Currency balances */}
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {currencySummaries.map(currency => (
              <div key={currency.code}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-default-400 uppercase tracking-wider">
                    {t.totalPending}
                  </span>
                  <Chip className="h-5" size="sm" variant="flat">
                    {currency.code}
                  </Chip>
                </div>
                <p className="text-3xl font-bold tracking-tight leading-tight">
                  {formatAmountES(currency.pending, currency.symbol)}
                </p>
                {currency.dueThisMonth > 0 && (
                  <p className="text-sm text-warning-500 mt-1">
                    {t.dueThisMonth}: {formatAmountES(currency.dueThisMonth, currency.symbol)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Equivalents */}
          {equivalents.length > 0 && (
            <div className="flex gap-3 sm:text-right">
              {equivalents.map(eq => (
                <div
                  key={eq.code}
                  className="rounded-md bg-default-100 dark:bg-default-50/10 px-3 py-2"
                >
                  <span className="text-xs text-default-400 block">≈ {eq.code}</span>
                  <span className="text-base font-semibold">
                    {formatAmountES(eq.total, eq.symbol)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: exchange rates (USD and EUR only) */}
        {exchangeRates.length > 0 &&
          (() => {
            const relevantRates = exchangeRates.filter(
              r => r.fromCode === 'USD' || r.fromCode === 'EUR'
            )

            if (relevantRates.length === 0) return null

            return (
              <div className="mt-auto pt-3 border-t border-default-200/50 dark:border-default-100/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-warning-500 shrink-0" size={14} />
                  {formattedDate && (
                    <span className="text-xs text-default-400">{formattedDate}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {relevantRates.map(rate => (
                    <span
                      key={`${rate.fromCode}-${rate.toCode}`}
                      className="text-base text-warning-600 dark:text-warning-400"
                    >
                      1 {rate.fromCode} ={' '}
                      <span className="font-semibold text-warning-500 dark:text-warning-300">
                        {formatRate(rate.rate)}
                      </span>{' '}
                      {rate.toCode}
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}
      </CardBody>
    </Card>
  )
}
