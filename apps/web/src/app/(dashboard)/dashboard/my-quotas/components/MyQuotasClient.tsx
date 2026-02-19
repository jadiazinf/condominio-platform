'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { useQuery, getHttpClient, quotaKeys } from '@packages/http-client'
import type { TApiDataResponse } from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'
import type { TQuota, TQuotaStatus } from '@packages/domain'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  TrendingUp,
  CalendarCheck,
  Download,
} from 'lucide-react'
import { downloadAccountStatement } from '@packages/http-client'
import type { TReportFormat } from '@packages/http-client'
import { useToast } from '@/ui/components/toast'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IMyQuotasClientProps {
  unitIds: string[]
  userId: string
}

type TStatusFilter = 'all' | TQuotaStatus

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_FILTERS: TStatusFilter[] = ['all', 'pending', 'overdue', 'paid', 'cancelled']

const STATUS_CHIP_COLOR: Record<TQuotaStatus, 'warning' | 'danger' | 'success' | 'default'> = {
  pending: 'warning',
  overdue: 'danger',
  paid: 'success',
  cancelled: 'default',
}

const STATUS_ICON: Record<TQuotaStatus, typeof Clock> = {
  pending: Clock,
  overdue: AlertCircle,
  paid: CheckCircle2,
  cancelled: XCircle,
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom hook: fetch quotas for multiple units in a single query
// ─────────────────────────────────────────────────────────────────────────────

function useQuotasByMultipleUnits(unitIds: string[]) {
  return useQuery<TQuota[]>({
    queryKey: [...quotaKeys.all, 'multi-unit', ...unitIds],
    queryFn: async () => {
      const client = getHttpClient()
      const results = await Promise.all(
        unitIds.map(async (unitId) => {
          const response = await client.get<TApiDataResponse<TQuota[]>>(
            `/quotas/unit/${unitId}`,
          )
          return response.data.data
        }),
      )
      return results.flat()
    },
    enabled: unitIds.length > 0,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatQuotaAmount(amount: string, currencySymbol: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return `${currencySymbol} 0.00`
  return `${currencySymbol} ${formatAmount(amount)}`
}

function formatDate(date: Date | string): string {
  return formatShortDate(date)
}

function formatPeriod(year: number, month: number | null, description: string | null): string {
  if (description) return description
  if (month !== null) {
    const date = new Date(year, month - 1)
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
  }
  return String(year)
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MyQuotasClient({ unitIds, userId: _userId }: IMyQuotasClientProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('all')
  const [exporting, setExporting] = useState<TReportFormat | null>(null)

  const { data: allQuotas, isLoading } = useQuotasByMultipleUnits(unitIds)

  const handleExport = async (format: TReportFormat) => {
    if (unitIds.length === 0) return

    setExporting(format)
    try {
      // Download account statement for the first unit (primary)
      await downloadAccountStatement({ unitId: unitIds[0], format })
      toast.success(t('resident.myQuotas.export.success'))
    } catch {
      toast.error(t('resident.myQuotas.export.error'))
    } finally {
      setExporting(null)
    }
  }

  // Sort quotas by dueDate descending
  const sortedQuotas = useMemo(() => {
    if (!allQuotas) return []
    return [...allQuotas].sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
    )
  }, [allQuotas])

  // Apply status filter
  const filteredQuotas = useMemo(() => {
    if (statusFilter === 'all') return sortedQuotas
    return sortedQuotas.filter((q) => q.status === statusFilter)
  }, [sortedQuotas, statusFilter])

  // Summary stats
  const stats = useMemo(() => {
    if (!sortedQuotas.length) {
      return { totalPending: 0, overdueCount: 0, paidThisMonth: 0, currency: '$' }
    }

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let totalPending = 0
    let overdueCount = 0
    let paidThisMonth = 0

    for (const quota of sortedQuotas) {
      const amount = parseFloat(quota.balance) || 0

      if (quota.status === 'pending') {
        totalPending += amount
      }

      if (quota.status === 'overdue') {
        totalPending += amount
        overdueCount++
      }

      if (quota.status === 'paid') {
        const dueDate = new Date(quota.dueDate)
        if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
          paidThisMonth++
        }
      }
    }

    // Use the currency from the first quota that has one
    const currency = sortedQuotas.find((q) => q.currency)?.currency?.symbol ?? '$'

    return { totalPending, overdueCount, paidThisMonth, currency }
  }, [sortedQuotas])

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Typography variant="h2">{t('resident.myQuotas.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('resident.myQuotas.subtitle')}
          </Typography>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="bordered"
            startContent={<Download size={16} />}
            isLoading={exporting === 'csv'}
            isDisabled={exporting !== null}
            onPress={() => handleExport('csv')}
          >
            {t('resident.myQuotas.export.csv')}
          </Button>
          <Button
            size="sm"
            variant="bordered"
            startContent={<Download size={16} />}
            isLoading={exporting === 'pdf'}
            isDisabled={exporting !== null}
            onPress={() => handleExport('pdf')}
          >
            {t('resident.myQuotas.export.pdf')}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Pending */}
        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-full bg-warning/10 p-3">
              <TrendingUp className="text-warning" size={24} />
            </div>
            <div>
              <Typography color="muted" variant="caption">
                {t('resident.myQuotas.totalPending')}
              </Typography>
              <Typography variant="h3">
                {formatQuotaAmount(String(stats.totalPending), stats.currency)}
              </Typography>
            </div>
          </CardBody>
        </Card>

        {/* Overdue Count */}
        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-full bg-danger/10 p-3">
              <AlertCircle className="text-danger" size={24} />
            </div>
            <div>
              <Typography color="muted" variant="caption">
                {t('resident.myQuotas.overdueCount')}
              </Typography>
              <Typography variant="h3">{stats.overdueCount}</Typography>
            </div>
          </CardBody>
        </Card>

        {/* Paid This Month */}
        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-full bg-success/10 p-3">
              <CalendarCheck className="text-success" size={24} />
            </div>
            <div>
              <Typography color="muted" variant="caption">
                {t('resident.myQuotas.paidThisMonth')}
              </Typography>
              <Typography variant="h3">{stats.paidThisMonth}</Typography>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter}
            color={statusFilter === filter ? 'primary' : 'default'}
            size="sm"
            variant={statusFilter === filter ? 'solid' : 'flat'}
            onPress={() => setStatusFilter(filter)}
          >
            {t(`resident.myQuotas.filter.${filter}`)}
          </Button>
        ))}
      </div>

      {/* Quota List */}
      {filteredQuotas.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="mb-3 text-default-300" size={48} />
            <Typography color="muted" variant="body1">
              {t('resident.myQuotas.empty')}
            </Typography>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuotas.map((quota) => {
            const StatusIcon = STATUS_ICON[quota.status as TQuotaStatus] ?? Clock
            const chipColor = STATUS_CHIP_COLOR[quota.status as TQuotaStatus] ?? 'default'
            const currencySymbol = quota.currency?.symbol ?? '$'

            return (
              <Card key={quota.id} className="transition-shadow hover:shadow-md">
                <CardBody className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Icon + Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`shrink-0 rounded-full bg-${chipColor}/10 p-2`}>
                        <StatusIcon className={`text-${chipColor}`} size={18} />
                      </div>
                      <div className="min-w-0">
                        <Typography className="truncate" variant="body1">
                          {quota.paymentConcept?.name ??
                            quota.periodDescription ??
                            t('resident.myQuotas.quota')}
                        </Typography>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <Typography color="muted" variant="caption">
                            {formatPeriod(
                              quota.periodYear,
                              quota.periodMonth,
                              quota.periodDescription,
                            )}
                          </Typography>
                          <Typography color="muted" variant="caption">
                            {t('resident.myQuotas.dueDate')}: {formatDate(quota.dueDate)}
                          </Typography>
                          {quota.unit?.unitNumber && (
                            <Chip color="default" size="sm" variant="flat">
                              {quota.unit.unitNumber}
                            </Chip>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount + Status */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Typography variant="body1">
                        {formatQuotaAmount(quota.baseAmount, currencySymbol)}
                      </Typography>
                      <Chip color={chipColor} size="sm" variant="flat">
                        {t(`resident.myQuotas.status.${quota.status}`)}
                      </Chip>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
