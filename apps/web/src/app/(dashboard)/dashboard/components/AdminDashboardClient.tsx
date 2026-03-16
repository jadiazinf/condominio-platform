'use client'

import type { ICondominium, IAdminPayment } from './admin'
import type { TPayment, TQuota } from '@packages/domain'

import { useMemo } from 'react'
import { Building2, Wallet, AlertTriangle } from 'lucide-react'
import {
  useCompanyCondominiumsPaginated,
  usePaymentsPaginated,
  useQuotasOverdue,
  usePaymentsByDateRange,
  useQuotasByPeriod,
} from '@packages/http-client'
import { formatShortDate } from '@packages/utils/dates'

import {
  AdminKpiStat,
  MonthlyIncomeCard,
  IncomeChart,
  CondominiumsOverview,
  RecentAdminPayments,
} from './admin'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AdminDashboardClientProps {
  displayName: string
  managementCompanyId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getMonthRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

function mapCondominiums(data: any[] | undefined): ICondominium[] {
  if (!data) return []

  return data.map(c => ({
    id: c.id,
    name: c.name,
    units: c._count?.units ?? c.unitsCount ?? 0,
    isActive: c.isActive,
  }))
}

function mapPayments(payments: TPayment[] | undefined): IAdminPayment[] {
  if (!payments) return []

  return payments.slice(0, 5).map(p => ({
    id: p.id,
    condominium: p.unit?.building?.condominium?.name ?? p.unit?.unitNumber ?? '-',
    unit: p.unit?.unitNumber ?? '-',
    amount: parseFloat(p.amount) || 0,
    currency: p.currency?.symbol ?? '$',
    status:
      p.status === 'completed' || p.status === 'pending_verification' || p.status === 'rejected'
        ? (p.status as 'completed' | 'pending_verification' | 'rejected')
        : 'completed',
    date: formatShortDate(p.paymentDate),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AdminDashboardClient({
  displayName,
  managementCompanyId,
}: AdminDashboardClientProps) {
  const { t } = useTranslation()

  // ── Data fetching ─────────────────────────────────────────────────────────

  // Condominiums
  const { data: condominiumsData, isLoading: condosLoading } = useCompanyCondominiumsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 50 },
    enabled: !!managementCompanyId,
  })
  const condominiums = condominiumsData?.data ?? []

  // Recent payments (paginated, limit 5)
  const { data: recentPaymentsData, isLoading: paymentsLoading } = usePaymentsPaginated({
    query: { page: 1, limit: 5 },
  })
  const recentPayments = recentPaymentsData?.data ?? []

  // Current month payments (for monthly income card)
  const { startDate, endDate } = useMemo(getMonthRange, [])
  const { data: monthPaymentsData } = usePaymentsByDateRange(startDate, endDate)
  const monthPayments: TPayment[] = monthPaymentsData?.data ?? []

  // Current month quotas (for expected amount)
  const now = new Date()
  const { data: monthQuotasData } = useQuotasByPeriod(now.getFullYear(), now.getMonth() + 1)
  const monthQuotas: TQuota[] = monthQuotasData?.data ?? []

  // Overdue quotas (delinquency)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const { data: overdueData } = useQuotasOverdue(todayStr)
  const overdueQuotas: TQuota[] = overdueData?.data ?? []

  // ── Computed values ───────────────────────────────────────────────────────

  // Monthly income: sum of completed payments this month
  const monthlyCollected = useMemo(() => {
    return monthPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  }, [monthPayments])

  // Monthly expected: sum of all quota base amounts this month
  const monthlyExpected = useMemo(() => {
    return monthQuotas.reduce((sum, q) => sum + (parseFloat(q.baseAmount) || 0), 0)
  }, [monthQuotas])

  // Delinquency: sum of overdue quota balances
  const totalDelinquency = useMemo(() => {
    return overdueQuotas.reduce((sum, q) => sum + (parseFloat(q.balance) || 0), 0)
  }, [overdueQuotas])

  // Active condominiums count
  const activeCondoCount = useMemo(() => {
    return condominiums.filter((c: any) => c.isActive).length
  }, [condominiums])

  // Currency symbol from first payment or quota
  const currencySymbol = useMemo(() => {
    const fromPayment = recentPayments.find((p: any) => p.currency)?.currency?.symbol
    const fromQuota = monthQuotas.find((q: TQuota) => q.currency)?.currency?.symbol

    return fromPayment ?? fromQuota ?? '$'
  }, [recentPayments, monthQuotas])

  // Mapped data for sub-components
  const mappedCondominiums = useMemo(() => mapCondominiums(condominiums), [condominiums])
  const mappedPayments = useMemo(() => mapPayments(recentPayments as TPayment[]), [recentPayments])

  // ── Show loading if critical data still loading ───────────────────────────

  if (condosLoading && paymentsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <Typography variant="h4">{t('admin.dashboard.welcome', { name: displayName })}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('admin.dashboard.subtitle')}
        </Typography>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MonthlyIncomeCard
          collected={monthlyCollected}
          color="success"
          currency={currencySymbol}
          expected={monthlyExpected}
          icon={<Wallet size={18} />}
          label={t('admin.dashboard.kpi.of')}
          title={t('admin.dashboard.kpi.monthlyIncome')}
          viewAllHref="/dashboard/payments"
          viewAllLabel={t('admin.dashboard.kpi.viewPayments')}
        />

        <AdminKpiStat
          change={`${overdueQuotas.length}`}
          changeType={totalDelinquency > 0 ? 'negative' : 'positive'}
          icon={<AlertTriangle className="text-danger" size={20} />}
          iconBg="bg-danger-50"
          title={t('admin.dashboard.kpi.delinquency')}
          value={`${currencySymbol} ${totalDelinquency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          viewAllHref="/dashboard/quotas"
          viewAllLabel={t('admin.dashboard.kpi.viewDelinquency')}
        />

        <AdminKpiStat
          change={`${condominiums.length} ${t('admin.dashboard.condominiums.total')}`}
          changeType="positive"
          icon={<Building2 className="text-success" size={20} />}
          iconBg="bg-success-50"
          title={t('admin.dashboard.kpi.condominiums')}
          value={String(activeCondoCount)}
          viewAllHref="/dashboard/condominiums"
          viewAllLabel={t('admin.dashboard.kpi.viewCondominiums')}
        />
      </div>

      {/* Income Chart */}
      <IncomeChart
        currencySymbol={currencySymbol}
        managementCompanyId={managementCompanyId}
        translations={{
          title: t('admin.dashboard.chart.title'),
          periods: {
            sixMonths: t('admin.dashboard.chart.sixMonths'),
            threeMonths: t('admin.dashboard.chart.threeMonths'),
            thirtyDays: t('admin.dashboard.chart.thirtyDays'),
            sevenDays: t('admin.dashboard.chart.sevenDays'),
          },
          collected: t('admin.dashboard.chart.collected'),
        }}
      />

      {/* Bottom Row: Condominios + Pagos Recientes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CondominiumsOverview
          condominiums={mappedCondominiums}
          translations={{
            title: t('admin.dashboard.condominiums.title'),
            viewAll: t('admin.dashboard.condominiums.viewAll'),
            units: t('admin.dashboard.condominiums.units'),
            active: t('admin.dashboard.condominiums.active'),
            inactive: t('admin.dashboard.condominiums.inactive'),
            empty: t('admin.dashboard.condominiums.empty'),
          }}
        />

        <RecentAdminPayments
          payments={mappedPayments}
          translations={{
            title: t('admin.dashboard.payments.title'),
            viewAll: t('admin.dashboard.payments.viewAll'),
            empty: t('admin.dashboard.payments.empty'),
            status: {
              completed: t('admin.dashboard.payments.status.completed'),
              pending_verification: t('admin.dashboard.payments.status.pendingVerification'),
              rejected: t('admin.dashboard.payments.status.rejected'),
            },
          }}
        />
      </div>
    </div>
  )
}
