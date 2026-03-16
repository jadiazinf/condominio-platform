'use client'

import type { TPaymentStatus } from '@packages/domain'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'
import { usePaymentDetail, usePaymentApplicationsByPayment } from '@packages/http-client'

import { getPaymentStatusColor } from '@/utils/status-colors'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Skeleton } from '@/ui/components/skeleton'
import { useTranslation } from '@/contexts'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return '-'

  return formatShortDate(date)
}

function fmtAmount(amount: string | null | undefined): string {
  if (!amount) return '-'

  return formatAmount(amount)
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MyPaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()

  const { data, isLoading, error } = usePaymentDetail(id)
  const payment = data?.data

  const { data: applicationsData } = usePaymentApplicationsByPayment(id, {
    enabled: !!payment,
  })
  const applications = applicationsData?.data ?? []

  // Progress: how much of the payment has been applied to quotas
  const totalApplied = useMemo(() => {
    return (
      applications.reduce((sum, app) => sum + Math.round(parseFloat(app.appliedAmount) * 100), 0) /
      100
    )
  }, [applications])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) return <PaymentDetailSkeleton />

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !payment) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('resident.myPayments.detail.error')}
        </Typography>
        <Button
          className="mt-4"
          color="primary"
          onPress={() => router.push('/dashboard/my-payments')}
        >
          {t('resident.myPayments.detail.backToPayments')}
        </Button>
      </div>
    )
  }

  const currencySymbol = payment.currency?.symbol ?? ''
  const currencyCode = payment.currency?.code ?? ''

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button isIconOnly variant="light" onPress={() => router.push('/dashboard/my-payments')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <Typography variant="h2">{t('resident.myPayments.detail.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {payment.paymentNumber || payment.id.slice(0, 8)}
          </Typography>
        </div>
        <Chip color={getPaymentStatusColor(payment.status)} size="lg" variant="flat">
          {t(`resident.myPayments.detail.status.${payment.status}`)}
        </Chip>
      </div>

      {/* Status message */}
      <StatusMessage
        status={payment.status as TPaymentStatus}
        t={t}
        verificationNotes={payment.verificationNotes}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Payment info */}
        <DetailSection title={t('resident.myPayments.detail.paymentInfo')}>
          <DetailRow
            label={t('resident.myPayments.detail.amount')}
            value={`${currencySymbol}${fmtAmount(payment.amount)} ${currencyCode}`}
          />
          {payment.paidAmount && (
            <DetailRow
              label={t('resident.myPayments.detail.paidAmount')}
              value={`${fmtAmount(payment.paidAmount)} ${payment.paidCurrency?.code ?? ''}`}
            />
          )}
          {payment.exchangeRate && (
            <DetailRow
              label={t('resident.myPayments.detail.exchangeRate')}
              value={payment.exchangeRate}
            />
          )}
          <DetailRow
            label={t('resident.myPayments.detail.method')}
            value={t(`resident.myPayments.detail.methods.${payment.paymentMethod}`)}
          />
          <DetailRow
            label={t('resident.myPayments.detail.paymentDate')}
            value={fmtDate(payment.paymentDate)}
          />
          {payment.receiptNumber && (
            <DetailRow
              label={t('resident.myPayments.detail.receiptNumber')}
              value={payment.receiptNumber}
            />
          )}
        </DetailSection>

        {/* Unit & dates */}
        <DetailSection title={t('resident.myPayments.detail.unitAndDates')}>
          {payment.unit?.unitNumber && (
            <DetailRow
              label={t('resident.myPayments.detail.unit')}
              value={payment.unit.unitNumber}
            />
          )}
          <DetailRow
            label={t('resident.myPayments.detail.registeredAt')}
            value={fmtDate(payment.registeredAt)}
          />
          {payment.verifiedAt && (
            <DetailRow
              label={t('resident.myPayments.detail.verifiedAt')}
              value={fmtDate(payment.verifiedAt)}
            />
          )}
        </DetailSection>
      </div>

      {/* Receipt link */}
      {payment.receiptUrl && (
        <div className="rounded-lg border border-default-200 p-4">
          <a
            className="inline-flex items-center gap-1 text-primary hover:underline"
            href={payment.receiptUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t('resident.myPayments.detail.viewReceipt')}
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* Notes */}
      {payment.notes && (
        <DetailSection title={t('resident.myPayments.detail.notes')}>
          <p className="text-sm text-default-700">{payment.notes}</p>
        </DetailSection>
      )}

      {/* Applied quotas */}
      {applications.length > 0 && (
        <DetailSection title={t('resident.myPayments.detail.appliedQuotas')}>
          <div className="space-y-2">
            {applications.map(app => (
              <div
                key={app.id}
                className="flex flex-col gap-1 rounded-md bg-default-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {currencySymbol}
                    {fmtAmount(app.appliedAmount)} {currencyCode}
                  </span>
                  <span className="text-xs text-default-500">{fmtDate(app.appliedAt)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-default-500">
                  {parseFloat(app.appliedToPrincipal ?? '0') > 0 && (
                    <span>
                      {t('resident.myPayments.detail.principal')}:{' '}
                      {fmtAmount(app.appliedToPrincipal)}
                    </span>
                  )}
                  {parseFloat(app.appliedToInterest ?? '0') > 0 && (
                    <span>
                      {t('resident.myPayments.detail.interest')}: {fmtAmount(app.appliedToInterest)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-default-200 pt-3">
            <Typography color="muted" variant="body2">
              {t('resident.myPayments.detail.totalApplied')}
            </Typography>
            <Typography variant="body2" weight="semibold">
              {currencySymbol}
              {fmtAmount(totalApplied.toFixed(2))} {currencyCode}
            </Typography>
          </div>
        </DetailSection>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Status message banner
// ─────────────────────────────────────────────────────────────────────────────

function StatusMessage({
  status,
  t,
  verificationNotes,
}: {
  status: TPaymentStatus
  t: (key: string) => string
  verificationNotes: string | null
}) {
  const config: Record<string, { bg: string; border: string; text: string }> = {
    pending_verification: {
      bg: 'bg-secondary-50',
      border: 'border-secondary-200',
      text: 'text-secondary-700',
    },
    completed: {
      bg: 'bg-success-50',
      border: 'border-success-200',
      text: 'text-success-700',
    },
    rejected: {
      bg: 'bg-danger-50',
      border: 'border-danger-200',
      text: 'text-danger-700',
    },
    refunded: {
      bg: 'bg-default-50',
      border: 'border-default-200',
      text: 'text-default-700',
    },
  }

  const c = config[status]

  if (!c) return null

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-4`}>
      <Typography className={c.text} variant="body2">
        {t(`resident.myPayments.detail.statusMessage.${status}`)}
      </Typography>
      {verificationNotes && status === 'rejected' && (
        <Typography className="mt-2 text-danger-600" variant="caption">
          {t('resident.myPayments.detail.adminNotes')}: {verificationNotes}
        </Typography>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-default-200 p-4">
      <Typography className="mb-3" variant="h4">
        {title}
      </Typography>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-default-500">{label}</span>
      {children ?? <span className="text-sm font-medium">{value}</span>}
    </div>
  )
}

function PaymentDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div>
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="mt-2 h-4 w-32 rounded" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="grid gap-6 sm:grid-cols-2">
        {[1, 2].map(i => (
          <div key={i} className="rounded-lg border border-default-200 p-4">
            <Skeleton className="mb-3 h-6 w-40 rounded" />
            <div className="space-y-3">
              {[1, 2, 3].map(j => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
