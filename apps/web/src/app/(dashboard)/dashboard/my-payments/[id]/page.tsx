'use client'

import type { TPayment, TPaymentStatus } from '@packages/domain'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { formatShortDate } from '@packages/utils/dates'
import { usePaymentDetail } from '@packages/http-client'

import { ConvertedAmount } from '@/ui/components/currency/ConvertedAmount'
import { getPaymentStatusColor } from '@/utils/status-colors'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Skeleton } from '@/ui/components/skeleton'
import { useTranslation } from '@/contexts'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IPaymentDetailsQuota {
  quotaId: string
  amount: string
  conceptName?: string
  periodYear?: number
  periodMonth?: number
  balance?: string
  paymentConceptId?: string
}

interface IPaymentApplication {
  quotaId: string
  appliedAmount: string
  conceptName?: string
  quota?: {
    periodYear: number
    periodMonth: number
    periodDescription?: string
    balance: string
    dueDate: string
  }
}

interface IBankAccount {
  displayName: string
  bankName: string
  accountHolderName: string
}

interface IEnrichedPaymentResponse {
  applications?: IPaymentApplication[]
  bankAccount?: IBankAccount
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return '-'

  return formatShortDate(date)
}

function getPaymentDetailsQuotas(payment: TPayment): IPaymentDetailsQuota[] {
  const details = payment.paymentDetails as {
    quotas?: IPaymentDetailsQuota[]
  } | null

  return details?.quotas ?? []
}

function getSenderInfo(payment: TPayment): {
  senderPhone?: string
  senderBankCode?: string
  senderDocument?: string
  bankAccountId?: string
} {
  const details = payment.paymentDetails as Record<string, unknown> | null

  if (!details) return {}

  return {
    senderPhone: details.senderPhone as string | undefined,
    senderBankCode: details.senderBankCode as string | undefined,
    senderDocument: details.senderDocument as string | undefined,
    bankAccountId: details.bankAccountId as string | undefined,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MyPaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()

  const { data, isLoading, error } = usePaymentDetail(id)
  const responseData = data?.data as (TPayment & IEnrichedPaymentResponse) | undefined
  const payment = responseData

  const monthNames: Record<string, string> = useMemo(
    () => ({
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
    }),
    [t]
  )

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

  const sender = getSenderInfo(payment)
  const applications = payment.applications ?? []
  const detailQuotas = getPaymentDetailsQuotas(payment)
  // Prefer applications (enriched from DB) over paymentDetails.quotas (JSONB snapshot)
  const quotaItems =
    applications.length > 0
      ? applications.map(app => ({
          quotaId: app.quotaId,
          amount: app.appliedAmount,
          conceptName: app.conceptName,
          periodYear: app.quota?.periodYear,
          periodMonth: app.quota?.periodMonth,
        }))
      : detailQuotas
  const destinationBank = payment.bankAccount

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
          <DetailRow label={t('resident.myPayments.detail.amount')}>
            <ConvertedAmount
              amount={payment.amount}
              currencyCode={payment.currency?.code}
              currencySymbol={payment.currency?.symbol}
              isBaseCurrency={payment.currency?.isBaseCurrency}
            />
          </DetailRow>
          {payment.paidAmount && (
            <DetailRow label={t('resident.myPayments.detail.paidAmount')}>
              <ConvertedAmount
                amount={payment.paidAmount}
                currencyCode={payment.paidCurrency?.code}
                currencySymbol={payment.paidCurrency?.symbol}
                isBaseCurrency={payment.paidCurrency?.isBaseCurrency}
              />
            </DetailRow>
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

      {/* Sender details */}
      {(sender.senderBankCode || sender.senderDocument || sender.senderPhone) && (
        <DetailSection title={t('resident.myPayments.detail.senderInfo')}>
          {sender.senderBankCode && (
            <DetailRow
              label={t('resident.myPayments.detail.senderBank')}
              value={sender.senderBankCode}
            />
          )}
          {sender.senderDocument && (
            <DetailRow
              label={t('resident.myPayments.detail.senderDocument')}
              value={sender.senderDocument}
            />
          )}
          {sender.senderPhone && (
            <DetailRow
              label={t('resident.myPayments.detail.senderPhone')}
              value={sender.senderPhone}
            />
          )}
        </DetailSection>
      )}

      {/* Destination bank account */}
      {destinationBank && (
        <DetailSection title={t('resident.myPayments.detail.destinationBank')}>
          <DetailRow
            label={t('resident.myPayments.detail.bankName')}
            value={destinationBank.bankName}
          />
          <DetailRow
            label={t('resident.myPayments.detail.accountName')}
            value={destinationBank.displayName}
          />
          <DetailRow
            label={t('resident.myPayments.detail.accountHolder')}
            value={destinationBank.accountHolderName}
          />
        </DetailSection>
      )}

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

      {/* Associated quotas */}
      {quotaItems.length > 0 && (
        <DetailSection title={t('resident.myPayments.detail.associatedQuotas')}>
          <div className="space-y-2">
            {quotaItems.map((q, i) => {
              const monthKey = String(q.periodMonth)
              const monthName = monthNames[monthKey] ?? monthKey
              const periodLabel =
                q.periodYear && q.periodMonth ? `${monthName} ${q.periodYear}` : '-'

              return (
                <div
                  key={q.quotaId || i}
                  className="flex flex-col gap-1 rounded-md bg-default-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {q.conceptName ?? t('resident.myPayments.detail.unknownConcept')}
                    </span>
                    <span className="text-xs text-default-500">{periodLabel}</span>
                  </div>
                  <ConvertedAmount
                    amount={q.amount}
                    className="text-sm font-medium"
                    currencyCode={payment.currency?.code}
                    currencySymbol={payment.currency?.symbol}
                    isBaseCurrency={payment.currency?.isBaseCurrency}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex justify-between border-t border-default-200 pt-3">
            <Typography color="muted" variant="body2">
              {t('resident.myPayments.detail.totalApplied')}
            </Typography>
            <ConvertedAmount
              amount={payment.amount}
              currencyCode={payment.currency?.code}
              currencySymbol={payment.currency?.symbol}
              isBaseCurrency={payment.currency?.isBaseCurrency}
            />
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
