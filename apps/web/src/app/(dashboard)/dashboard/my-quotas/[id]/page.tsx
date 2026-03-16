'use client'

import type { TQuotaStatus } from '@packages/domain'

import { useParams, useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { ArrowLeft, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'
import { useQuotaDetail, usePaymentApplicationsByQuota } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Skeleton } from '@/ui/components/skeleton'
import { Spinner } from '@/ui/components/spinner'
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

function fmtPeriod(year: number, month: number | null, description: string | null): string {
  if (description) return description
  if (month !== null) {
    const date = new Date(year, month - 1)

    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
  }

  return String(year)
}

const QUOTA_STATUS_CHIP_COLOR: Record<
  TQuotaStatus,
  'warning' | 'danger' | 'success' | 'default' | 'secondary' | 'primary'
> = {
  pending: 'warning',
  partial: 'primary',
  overdue: 'danger',
  paid: 'success',
  cancelled: 'default',
  exonerated: 'secondary',
}

const QUOTA_STATUS_ICON: Record<TQuotaStatus, typeof Clock> = {
  pending: Clock,
  partial: Clock,
  overdue: AlertCircle,
  paid: CheckCircle2,
  cancelled: XCircle,
  exonerated: CheckCircle2,
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MyQuotaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()

  const { data, isLoading, error } = useQuotaDetail(id)
  const quota = data?.data

  const { data: applicationsData, isLoading: appsLoading } = usePaymentApplicationsByQuota(id, {
    enabled: !!quota,
  })
  const applications = applicationsData?.data ?? []

  // Amount breakdown
  const amountBreakdown = useMemo(() => {
    if (!quota) return null
    const base = parseFloat(quota.baseAmount) || 0
    const interest = parseFloat(quota.interestAmount) || 0
    const paid = parseFloat(quota.paidAmount) || 0
    const balance = parseFloat(quota.balance) || 0

    return { base, interest, total: base + interest, paid, balance }
  }, [quota])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) return <QuotaDetailSkeleton />

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !quota) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('resident.myQuotas.detail.error')}
        </Typography>
        <Button
          className="mt-4"
          color="primary"
          onPress={() => router.push('/dashboard/my-quotas')}
        >
          {t('resident.myQuotas.detail.backToQuotas')}
        </Button>
      </div>
    )
  }

  const currencySymbol = quota.currency?.symbol ?? '$'
  const currencyCode = quota.currency?.code ?? ''
  const status = quota.status as TQuotaStatus
  const StatusIcon = QUOTA_STATUS_ICON[status] ?? Clock
  const chipColor = QUOTA_STATUS_CHIP_COLOR[status] ?? 'default'
  const isPending = status === 'pending' || status === 'overdue'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button isIconOnly variant="light" onPress={() => router.push('/dashboard/my-quotas')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <Typography variant="h2">{t('resident.myQuotas.detail.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {quota.paymentConcept?.name ??
              fmtPeriod(quota.periodYear, quota.periodMonth, quota.periodDescription)}
          </Typography>
        </div>
        <Chip color={chipColor} size="lg" startContent={<StatusIcon size={14} />} variant="flat">
          {t(`resident.myQuotas.detail.status.${status}`)}
        </Chip>
      </div>

      {/* Amount breakdown card */}
      {amountBreakdown && (
        <div className="rounded-lg border border-default-200 p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <AmountCard
              amount={`${currencySymbol}${fmtAmount(quota.baseAmount)}`}
              label={t('resident.myQuotas.detail.baseAmount')}
            />
            <AmountCard
              amount={`${currencySymbol}${fmtAmount(quota.interestAmount)}`}
              highlight={amountBreakdown.interest > 0 ? 'danger' : undefined}
              label={t('resident.myQuotas.detail.interest')}
            />
            <AmountCard
              amount={`${currencySymbol}${fmtAmount(quota.paidAmount)}`}
              highlight={amountBreakdown.paid > 0 ? 'success' : undefined}
              label={t('resident.myQuotas.detail.paid')}
            />
            <AmountCard
              amount={`${currencySymbol}${fmtAmount(quota.balance)}`}
              highlight={amountBreakdown.balance > 0 ? 'warning' : undefined}
              label={t('resident.myQuotas.detail.balance')}
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Period & concept */}
        <DetailSection title={t('resident.myQuotas.detail.conceptInfo')}>
          <DetailRow
            label={t('resident.myQuotas.detail.concept')}
            value={quota.paymentConcept?.name ?? '-'}
          />
          <DetailRow
            label={t('resident.myQuotas.detail.period')}
            value={fmtPeriod(quota.periodYear, quota.periodMonth, quota.periodDescription)}
          />
          <DetailRow
            label={t('resident.myQuotas.detail.currency')}
            value={`${quota.currency?.name ?? ''} (${currencyCode})`}
          />
        </DetailSection>

        {/* Dates & unit */}
        <DetailSection title={t('resident.myQuotas.detail.datesAndUnit')}>
          {quota.unit?.unitNumber && (
            <DetailRow label={t('resident.myQuotas.detail.unit')} value={quota.unit.unitNumber} />
          )}
          <DetailRow
            label={t('resident.myQuotas.detail.issueDate')}
            value={fmtDate(quota.issueDate)}
          />
          <DetailRow label={t('resident.myQuotas.detail.dueDate')} value={fmtDate(quota.dueDate)} />
        </DetailSection>
      </div>

      {/* Notes */}
      {quota.notes && (
        <DetailSection title={t('resident.myQuotas.detail.notes')}>
          <p className="text-sm text-default-700">{quota.notes}</p>
        </DetailSection>
      )}

      {/* Payment action */}
      {isPending && (
        <div className="flex justify-center">
          <Button as={Link} color="primary" href="/dashboard/report-payment" size="lg">
            {t('resident.myQuotas.detail.reportPayment')}
          </Button>
        </div>
      )}

      {/* Payment applications (history) */}
      <DetailSection title={t('resident.myQuotas.detail.paymentHistory')}>
        {appsLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : applications.length === 0 ? (
          <Typography color="muted" variant="body2">
            {t('resident.myQuotas.detail.noPayments')}
          </Typography>
        ) : (
          <div className="space-y-2">
            {applications.map(app => (
              <Link
                key={app.id}
                className="block rounded-md bg-default-50 p-3 transition-colors hover:bg-default-100"
                href={`/dashboard/my-payments/${app.paymentId}`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
                        {t('resident.myQuotas.detail.principal')}:{' '}
                        {fmtAmount(app.appliedToPrincipal)}
                      </span>
                    )}
                    {parseFloat(app.appliedToInterest ?? '0') > 0 && (
                      <span>
                        {t('resident.myQuotas.detail.interestPaid')}:{' '}
                        {fmtAmount(app.appliedToInterest)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DetailSection>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AmountCard({
  label,
  amount,
  highlight,
}: {
  label: string
  amount: string
  highlight?: 'danger' | 'success' | 'warning'
}) {
  const textColor = highlight ? `text-${highlight}` : ''

  return (
    <div className="text-center">
      <Typography color="muted" variant="caption">
        {label}
      </Typography>
      <Typography className={textColor} variant="h4">
        {amount}
      </Typography>
    </div>
  )
}

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

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-default-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function QuotaDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div>
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="mt-2 h-4 w-64 rounded" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
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
