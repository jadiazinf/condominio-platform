'use client'

import type { TPayment } from '@packages/domain'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import { CreditCard, Plus } from 'lucide-react'
import { formatShortDate } from '@packages/utils/dates'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Select, type ISelectItem } from '@/ui/components/select'
import { DatePicker } from '@/ui/components/date-picker'
import { Pagination } from '@/ui/components/pagination'
import { ClearFiltersButton } from '@/ui/components/filters'
import { Table, type ITableColumn } from '@/ui/components/table'
import { ConvertedAmount } from '@/ui/components/currency/ConvertedAmount'
import { getPaymentStatusColor } from '@/utils/status-colors'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IMyPaymentsContentProps {
  payments: TPayment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  currentFilters: {
    status: string
    startDate: string
    endDate: string
  }
}

interface IPaymentDetailsQuota {
  quotaId: string
  amount: string
  conceptName?: string
  periodYear?: number
  periodMonth?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getQuotaSummary(payment: TPayment, monthNames: Record<string, string>): string {
  const details = payment.paymentDetails as {
    quotas?: IPaymentDetailsQuota[]
  } | null

  if (!details?.quotas?.length) return '-'

  const quotas = details.quotas
  const concepts = Array.from(new Set(quotas.map(q => q.conceptName).filter(Boolean)))
  const conceptStr = concepts.length > 0 ? concepts.join(', ') : '-'

  const periods = quotas
    .filter(q => q.periodYear && q.periodMonth)
    .map(q => {
      const monthKey = String(q.periodMonth)
      const monthName = monthNames[monthKey] ?? monthKey

      return `${monthName} ${q.periodYear}`
    })

  const uniquePeriods = Array.from(new Set(periods))

  if (uniquePeriods.length === 0) return conceptStr
  if (uniquePeriods.length <= 2) return `${conceptStr} (${uniquePeriods.join(', ')})`

  return `${conceptStr} (${uniquePeriods[0]}, +${uniquePeriods.length - 1})`
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MyPaymentsContent({
  payments,
  pagination,
  currentFilters,
}: IMyPaymentsContentProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const monthNames: Record<string, string> = {
    '1': t('resident.myQuotas.months.1'),
    '2': t('resident.myQuotas.months.2'),
    '3': t('resident.myQuotas.months.3'),
    '4': t('resident.myQuotas.months.4'),
    '5': t('resident.myQuotas.months.5'),
    '6': t('resident.myQuotas.months.6'),
    '7': t('resident.myQuotas.months.7'),
    '8': t('resident.myQuotas.months.8'),
    '9': t('resident.myQuotas.months.9'),
    '10': t('resident.myQuotas.months.10'),
    '11': t('resident.myQuotas.months.11'),
    '12': t('resident.myQuotas.months.12'),
  }

  // Build URL with updated params
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }

      // Reset to page 1 when filters change (unless updating page itself)
      if (!('page' in updates)) {
        params.delete('page')
      }

      const query = params.toString()

      router.push(`${pathname}${query ? `?${query}` : ''}`)
    },
    [router, pathname, searchParams]
  )

  const clearFilters = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  const hasActiveFilters =
    currentFilters.status !== '' || currentFilters.startDate !== '' || currentFilters.endDate !== ''

  // Status options for Select
  const statusOptions: ISelectItem[] = [
    { key: '', label: t('resident.myPayments.filter.all') },
    { key: 'pending_verification', label: t('resident.myPayments.filter.pendingVerification') },
    { key: 'completed', label: t('resident.myPayments.filter.completed') },
    { key: 'rejected', label: t('resident.myPayments.filter.rejected') },
    { key: 'pending', label: t('resident.myPayments.filter.pending') },
    { key: 'failed', label: t('resident.myPayments.filter.failed') },
    { key: 'refunded', label: t('resident.myPayments.filter.refunded') },
  ]

  const getPaymentMethodLabel = useCallback(
    (method: string) => t(`resident.myPayments.method.${method}`),
    [t]
  )

  // Table columns
  const columns: ITableColumn<TPayment>[] = [
    { key: 'paymentDate', label: t('resident.myPayments.table.date') },
    { key: 'concept', label: t('resident.myPayments.table.concept') },
    { key: 'amount', label: t('resident.myPayments.table.amount'), align: 'end' },
    { key: 'paymentMethod', label: t('resident.myPayments.table.method'), hideOnMobile: true },
    { key: 'receiptNumber', label: t('resident.myPayments.table.receipt'), hideOnMobile: true },
    { key: 'status', label: t('resident.myPayments.table.status'), align: 'center' },
  ]

  const renderCell = useCallback(
    (payment: TPayment, columnKey: keyof TPayment | string) => {
      switch (columnKey) {
        case 'paymentDate':
          return (
            <Typography variant="body2">
              {payment.paymentDate ? formatShortDate(payment.paymentDate) : '-'}
            </Typography>
          )
        case 'concept':
          return (
            <Typography className="max-w-[200px] truncate" variant="body2">
              {getQuotaSummary(payment, monthNames)}
            </Typography>
          )
        case 'amount':
          return (
            <div className="text-right">
              <ConvertedAmount
                amount={payment.amount}
                currencyCode={payment.currency?.code}
                currencySymbol={payment.currency?.symbol}
                isBaseCurrency={payment.currency?.isBaseCurrency}
              />
            </div>
          )
        case 'paymentMethod':
          return (
            <Typography color="muted" variant="body2">
              {getPaymentMethodLabel(payment.paymentMethod)}
            </Typography>
          )
        case 'receiptNumber':
          return (
            <Typography color="muted" variant="caption">
              {payment.receiptNumber ? `#${payment.receiptNumber}` : '-'}
            </Typography>
          )
        case 'status':
          return (
            <Chip color={getPaymentStatusColor(payment.status)} size="sm" variant="flat">
              {t(`resident.myPayments.status.${payment.status}`)}
            </Chip>
          )
        default:
          return null
      }
    },
    [t, getPaymentMethodLabel, monthNames]
  )

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-3">
        <Select
          className="w-48"
          items={statusOptions}
          label={t('resident.myPayments.filter.status')}
          placeholder={t('resident.myPayments.filter.all')}
          value={currentFilters.status}
          variant="bordered"
          onChange={value => updateParams({ status: value || undefined })}
        />

        <DatePicker
          className="w-44"
          label={t('resident.myPayments.filter.startDate')}
          value={currentFilters.startDate}
          variant="bordered"
          onChange={value => updateParams({ startDate: value || undefined })}
        />

        <DatePicker
          className="w-44"
          label={t('resident.myPayments.filter.endDate')}
          value={currentFilters.endDate}
          variant="bordered"
          onChange={value => updateParams({ endDate: value || undefined })}
        />

        {hasActiveFilters && <ClearFiltersButton onClear={clearFilters} />}

        <div className="ml-auto">
          <Button as={Link} color="primary" href="/dashboard/pay" startContent={<Plus size={16} />}>
            {t('resident.myPayments.reportPayment')}
          </Button>
        </div>
      </div>

      {/* Table / Cards or empty state */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <CreditCard className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('resident.myPayments.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('resident.myPayments.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table
            aria-label={t('resident.myPayments.title')}
            columns={columns}
            renderCell={renderCell}
            rows={payments}
            onRowClick={payment => router.push(`/dashboard/my-payments/${payment.id}`)}
          />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              limit={pagination.limit}
              page={pagination.page}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onLimitChange={limit => updateParams({ limit: String(limit), page: '1' })}
              onPageChange={page => updateParams({ page: String(page) })}
            />
          )}
        </>
      )}
    </div>
  )
}
