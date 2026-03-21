'use client'

import type { TPayment } from '@packages/domain'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import { CreditCard, Plus } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Select, type ISelectItem } from '@/ui/components/select'
import { DatePicker } from '@/ui/components/date-picker'
import { Pagination } from '@/ui/components/pagination'
import { ClearFiltersButton } from '@/ui/components/filters'
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null): string {
  if (!date) return '-'

  return formatShortDate(date)
}

function formatPaymentAmount(amount: string | null): string {
  if (!amount) return '-'

  return formatAmount(amount)
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

      {/* Payment cards or empty state */}
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
          <div className="space-y-3">
            {payments.map(payment => (
              <Card
                key={payment.id}
                isHoverable
                isPressable
                className="cursor-pointer"
                onPress={() => router.push(`/dashboard/my-payments/${payment.id}`)}
              >
                <CardBody className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left side: payment info */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Typography variant="subtitle1" weight="semibold">
                          {payment.currency?.symbol ?? ''}
                          {formatPaymentAmount(payment.amount)}
                        </Typography>
                        {payment.currency && (
                          <Typography color="muted" variant="caption">
                            {payment.currency.code}
                          </Typography>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <Typography color="muted" variant="body2">
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </Typography>
                        <Typography color="muted" variant="body2">
                          {formatDate(payment.paymentDate)}
                        </Typography>
                        {payment.unit?.unitNumber && (
                          <Typography color="muted" variant="body2">
                            {t('resident.myPayments.unit')}: {payment.unit.unitNumber}
                          </Typography>
                        )}
                        {payment.receiptNumber && (
                          <Typography color="muted" variant="caption">
                            #{payment.receiptNumber}
                          </Typography>
                        )}
                      </div>
                      {payment.notes && (
                        <Typography className="mt-1" color="muted" variant="caption">
                          {payment.notes}
                        </Typography>
                      )}
                      {payment.verificationNotes && (
                        <Typography className="mt-1" color="danger" variant="caption">
                          {t('resident.myPayments.verificationNotes')}: {payment.verificationNotes}
                        </Typography>
                      )}
                    </div>

                    {/* Right side: status chip */}
                    <div className="flex items-center">
                      <Chip color={getPaymentStatusColor(payment.status)} variant="flat">
                        {t(`resident.myPayments.status.${payment.status}`)}
                      </Chip>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

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
