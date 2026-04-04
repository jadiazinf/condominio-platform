'use client'

import type { TPayment } from '@packages/domain'

import { useMemo } from 'react'
import { useBillingCharges, usePaymentsByUser, useMyLatestExchangeRates } from '@packages/http-client'

import {
  AccountBalanceCard,
  RecentPayments,
  QuickActions,
  type IPayment,
} from './resident'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IResidentDashboardClientProps {
  displayName: string
  condominiumName?: string
  userId: string
  unitIds: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Valid status sets for filtering
// ─────────────────────────────────────────────────────────────────────────────

const VALID_PAYMENT_STATUSES = new Set<IPayment['status']>([
  'completed',
  'pending_verification',
  'rejected',
])

// ─────────────────────────────────────────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────────────────────────────────────────

function formatDateES(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')

  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPeriod(year: number, month: number): string {
  return `${String(month).padStart(2, '0')}/${year}`
}

function mapPayment(payment: TPayment): IPayment | null {
  if (!VALID_PAYMENT_STATUSES.has(payment.status as IPayment['status'])) {
    return null
  }

  return {
    id: payment.id,
    amount: parseFloat(payment.amount),
    currency: payment.currency?.symbol || '$',
    date: formatDateES(payment.paymentDate),
    method: payment.paymentMethod,
    status: payment.status as IPayment['status'],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ResidentDashboardClient({
  displayName,
  condominiumName,
  userId,
  unitIds,
}: IResidentDashboardClientProps) {
  const { t } = useTranslation()

  const primaryUnitId = unitIds[0] ?? ''

  const { data: chargesResponse, isLoading: isLoadingCharges } = useBillingCharges(
    { unitId: primaryUnitId },
    { enabled: !!primaryUnitId }
  )

  const { data: paymentsResponse, isLoading: isLoadingPayments } = usePaymentsByUser(userId)

  const { data: ratesResponse } = useMyLatestExchangeRates()

  const isLoading = isLoadingCharges || isLoadingPayments

  const payments = useMemo<IPayment[]>(() => {
    const rawPayments = paymentsResponse?.data ?? []
    const mapped: IPayment[] = []

    for (const payment of rawPayments) {
      const result = mapPayment(payment)

      if (result) {
        mapped.push(result)
      }
    }

    return mapped
  }, [paymentsResponse])

  // Calculate totals from charges
  const currencyTotals = useMemo(() => {
    const totals = new Map<string, { symbol: string; pending: number; dueThisMonth: number }>()
    const charges = chargesResponse?.data ?? []

    for (const c of charges) {
      if (c.status === 'paid' || c.status === 'cancelled') continue
      const key = 'USD'

      if (!totals.has(key)) {
        totals.set(key, { symbol: '$', pending: 0, dueThisMonth: 0 })
      }
      const entry = totals.get(key)!
      entry.pending += parseFloat(c.balance)
    }

    return totals
  }, [chargesResponse])

  // Build multi-currency summaries
  const currencySummaries = useMemo(() => {
    return Array.from(currencyTotals.entries()).map(([code, entry]) => ({
      code,
      symbol: entry.symbol,
      pending: entry.pending,
      dueThisMonth: entry.dueThisMonth,
    }))
  }, [currencyTotals])

  // Map exchange rates for display
  const exchangeRates = useMemo(() => {
    const rates = ratesResponse?.data ?? []

    return rates.map(rate => ({
      fromCode: rate.fromCurrency?.code ?? '???',
      toCode: rate.toCurrency?.code ?? '???',
      rate: parseFloat(rate.rate),
      effectiveDate: rate.effectiveDate,
    }))
  }, [ratesResponse])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <Typography variant="h2">{t('dashboard.welcome', { name: displayName })}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('resident.dashboard.subtitle')}
        </Typography>
        {condominiumName && (
          <Typography className="mt-2" color="muted" variant="caption">
            {condominiumName}
          </Typography>
        )}
      </div>

      {/* Account Balance + Quick Actions Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AccountBalanceCard
            currencySummaries={currencySummaries}
            exchangeRates={exchangeRates}
            translations={{
              totalPending: t('resident.dashboard.totalPending'),
              dueThisMonth: t('resident.dashboard.dueThisMonth'),
              upToDate: t('resident.dashboard.upToDate'),
              payNow: t('resident.dashboard.payNow'),
              exchangeRates: t('resident.dashboard.exchangeRates'),
              updatedAt: t('resident.dashboard.updatedAt'),
              noPendingConcepts: t('resident.dashboard.noPendingConcepts'),
            }}
          />
        </div>
        <QuickActions
          translations={{
            title: t('resident.dashboard.quickActions'),
            payQuota: t('resident.dashboard.payQuota'),
            viewStatement: t('resident.dashboard.viewStatement'),
            paymentHistory: t('resident.dashboard.paymentHistory'),
            notifications: t('resident.dashboard.notifications'),
          }}
        />
      </div>

      {/* Payments */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentPayments
          payments={payments}
          translations={{
            title: t('resident.dashboard.recentPayments'),
            noPayments: t('resident.dashboard.noRecentPayments'),
            viewAll: t('resident.dashboard.viewAllPayments'),
            status: {
              completed: t('resident.dashboard.paymentStatus.completed'),
              pending_verification: t('resident.dashboard.paymentStatus.pending_verification'),
              rejected: t('resident.dashboard.paymentStatus.rejected'),
            },
          }}
        />
      </div>
    </div>
  )
}
