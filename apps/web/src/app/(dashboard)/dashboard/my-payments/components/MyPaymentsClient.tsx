'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { CreditCard, Plus } from 'lucide-react'
import { usePaymentsByUser } from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'
import type { TPayment, TPaymentStatus } from '@packages/domain'
import type { TChipColor } from '@/ui/components/chip'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TStatusFilter = 'all' | 'pending_verification' | 'completed' | 'rejected'

interface IMyPaymentsClientProps {
  userId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStatusColor(status: TPaymentStatus): TChipColor {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'pending_verification':
      return 'secondary'
    case 'completed':
      return 'success'
    case 'failed':
      return 'danger'
    case 'refunded':
      return 'primary'
    case 'rejected':
      return 'danger'
    default:
      return 'default'
  }
}

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

export function MyPaymentsClient({ userId }: IMyPaymentsClientProps) {
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('all')

  const { data, isLoading, error, refetch } = usePaymentsByUser(userId)

  const payments: TPayment[] = data?.data ?? []

  // Filter payments by status
  const filteredPayments = useMemo(() => {
    if (statusFilter === 'all') return payments
    return payments.filter((p) => p.status === statusFilter)
  }, [payments, statusFilter])

  // Status filter tabs
  const statusTabs: { key: TStatusFilter; label: string }[] = useMemo(
    () => [
      { key: 'all', label: t('resident.myPayments.filter.all') },
      { key: 'pending_verification', label: t('resident.myPayments.filter.pendingVerification') },
      { key: 'completed', label: t('resident.myPayments.filter.completed') },
      { key: 'rejected', label: t('resident.myPayments.filter.rejected') },
    ],
    [t]
  )

  const getPaymentMethodLabel = useCallback(
    (method: string) => t(`resident.myPayments.method.${method}`),
    [t]
  )

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('resident.myPayments.error')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top bar: Report Payment button */}
      <div className="flex justify-end">
        <Button
          as={Link}
          color="primary"
          href="/dashboard/report-payment"
          startContent={<Plus size={16} />}
        >
          {t('resident.myPayments.reportPayment')}
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Button
            key={tab.key}
            color={statusFilter === tab.key ? 'primary' : 'default'}
            size="sm"
            variant={statusFilter === tab.key ? 'solid' : 'flat'}
            onPress={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filteredPayments.length === 0 ? (
        /* Empty state */
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
        /* Payment cards list */
        <div className="space-y-3">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} isHoverable>
              <CardBody className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left side: payment info */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Typography variant="subtitle1" weight="semibold">
                        {payment.currency?.symbol ?? ''}{formatPaymentAmount(payment.amount)}
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
                    <Chip color={getStatusColor(payment.status)} variant="flat">
                      {t(`resident.myPayments.status.${payment.status}`)}
                    </Chip>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
