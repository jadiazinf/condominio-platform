'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { useQuotasByUnit, usePaymentsByUser } from '@packages/http-client'
import type { TQuota, TPayment } from '@packages/domain'

import {
  AccountBalanceCard,
  UpcomingQuotas,
  RecentPayments,
  QuickActions,
  type IQuota,
  type IPayment,
} from './resident'

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

const VALID_QUOTA_STATUSES = new Set<IQuota['status']>(['pending', 'overdue', 'paid'])
const VALID_PAYMENT_STATUSES = new Set<IPayment['status']>([
  'completed',
  'pending_verification',
  'rejected',
])

// ─────────────────────────────────────────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────────────────────────────────────────

function mapQuota(quota: TQuota): IQuota | null {
  if (!VALID_QUOTA_STATUSES.has(quota.status as IQuota['status'])) {
    return null
  }

  return {
    id: quota.id,
    concept: quota.paymentConcept?.name || quota.periodDescription || 'Quota',
    amount: parseFloat(quota.baseAmount),
    currency: quota.currency?.symbol || '$',
    dueDate: new Date(quota.dueDate).toLocaleDateString(),
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
    date: new Date(payment.paymentDate).toLocaleDateString(),
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

  const {
    data: quotasResponse,
    isLoading: isLoadingQuotas,
  } = useQuotasByUnit(primaryUnitId, { enabled: !!primaryUnitId })

  const {
    data: paymentsResponse,
    isLoading: isLoadingPayments,
  } = usePaymentsByUser(userId)

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

  // Calculate totals
  const totalPending = useMemo(
    () => quotas.filter((q) => q.status !== 'paid').reduce((sum, q) => sum + q.amount, 0),
    [quotas],
  )

  const dueThisMonth = useMemo(
    () => quotas.filter((q) => q.status === 'pending').reduce((sum, q) => sum + q.amount, 0),
    [quotas],
  )

  // Determine currency from first non-paid quota, or fallback
  const currency = useMemo(() => {
    const firstQuota = quotas.find((q) => q.status !== 'paid')
    return firstQuota?.currency ?? '$'
  }, [quotas])

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
            currency={currency}
            dueThisMonth={dueThisMonth}
            totalPending={totalPending}
            translations={{
              totalPending: t('resident.dashboard.totalPending'),
              dueThisMonth: t('resident.dashboard.dueThisMonth'),
              upToDate: t('resident.dashboard.upToDate'),
              payNow: t('resident.dashboard.payNow'),
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
            status: {
              pending: t('resident.dashboard.status.pending'),
              overdue: t('resident.dashboard.status.overdue'),
              paid: t('resident.dashboard.status.paid'),
            },
          }}
        />
        <RecentPayments
          payments={payments}
          translations={{
            title: t('resident.dashboard.recentPayments'),
            noPayments: t('resident.dashboard.noRecentPayments'),
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
