'use client'

import type { TQuota, TPayment } from '@packages/domain'

import { useMemo } from 'react'
import { useQuotasByUnit, usePaymentsByUser, useMyLatestExchangeRates } from '@packages/http-client'

import {
  AccountBalanceCard,
  UpcomingQuotas,
  RecentPayments,
  QuickActions,
  type IQuota,
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

const VALID_QUOTA_STATUSES = new Set<IQuota['status']>(['pending', 'partial', 'overdue', 'paid'])
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

const ENGLISH_TO_SPANISH_MONTHS: Record<string, string> = {
  January: 'Enero',
  February: 'Febrero',
  March: 'Marzo',
  April: 'Abril',
  May: 'Mayo',
  June: 'Junio',
  July: 'Julio',
  August: 'Agosto',
  September: 'Septiembre',
  October: 'Octubre',
  November: 'Noviembre',
  December: 'Diciembre',
}

function translatePeriodDescription(description: string): string {
  if (!description) return ''

  return description.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,
    match => ENGLISH_TO_SPANISH_MONTHS[match] ?? match
  )
}

function mapQuota(quota: TQuota): IQuota | null {
  if (!VALID_QUOTA_STATUSES.has(quota.status as IQuota['status'])) {
    return null
  }

  return {
    id: quota.id,
    concept: quota.paymentConcept?.name || 'Cuota',
    periodDescription: translatePeriodDescription(quota.periodDescription || ''),
    amount: parseFloat(quota.baseAmount),
    balance: parseFloat(quota.balance),
    currency: quota.currency?.symbol || '$',
    currencyCode: quota.currency?.code || 'USD',
    dueDate: formatDateES(quota.dueDate),
    status: quota.status as IQuota['status'],
  }
}

function mapPayment(payment: TPayment): IPayment | null {
  if (!VALID_PAYMENT_STATUSES.has(payment.status as IPayment['status'])) {
    return null
  }

  return {
    id: payment.id,
    amount: parseFloat(payment.amount),
    currency: payment.currency?.code || '$',
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

  const { data: quotasResponse, isLoading: isLoadingQuotas } = useQuotasByUnit(primaryUnitId, {
    enabled: !!primaryUnitId,
  })

  const { data: paymentsResponse, isLoading: isLoadingPayments } = usePaymentsByUser(userId)

  const { data: ratesResponse } = useMyLatestExchangeRates()

  const isLoading = isLoadingQuotas || isLoadingPayments

  // Map API data to component interfaces
  const quotas = useMemo<IQuota[]>(() => {
    const rawQuotas = quotasResponse?.data ?? []
    const mapped: IQuota[] = []

    for (const quota of rawQuotas) {
      const result = mapQuota(quota)

      if (result) {
        mapped.push(result)
      }
    }

    return mapped
  }, [quotasResponse])

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

  // Calculate totals grouped by currency
  const currencyTotals = useMemo(() => {
    const totals = new Map<string, { symbol: string; pending: number; dueThisMonth: number }>()

    for (const q of quotas) {
      if (q.status === 'paid') continue
      const key = q.currencyCode

      if (!totals.has(key)) {
        totals.set(key, { symbol: q.currency, pending: 0, dueThisMonth: 0 })
      }
      const entry = totals.get(key)!

      entry.pending += q.balance
      if (q.status === 'pending') {
        entry.dueThisMonth += q.balance
      }
    }

    return totals
  }, [quotas])

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

      {/* Quotas and Payments Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingQuotas
          quotas={quotas}
          translations={{
            title: t('resident.dashboard.upcomingQuotas'),
            noQuotas: t('resident.dashboard.noUpcomingQuotas'),
            dueDate: t('resident.dashboard.dueDate'),
            viewAll: t('resident.dashboard.viewAllQuotas'),
            balance: t('resident.dashboard.balance'),
            status: {
              pending: t('resident.dashboard.status.pending'),
              partial: t('resident.dashboard.status.partial'),
              overdue: t('resident.dashboard.status.overdue'),
              paid: t('resident.dashboard.status.paid'),
              exonerated: t('resident.dashboard.status.exonerated'),
            },
          }}
        />
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
