'use client'

import { useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import type { TPaymentStatus } from '@packages/domain'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Skeleton } from '@/ui/components/skeleton'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import {
  usePaymentDetail,
  verifyPayment,
  rejectPayment,
  paymentKeys,
  useQueryClient,
} from '@packages/http-client'

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = usePaymentDetail(id)
  const payment = data?.data

  const getStatusColor = (status: TPaymentStatus) => {
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

  const getPaymentMethodLabel = useCallback(
    (method: string) => t(`admin.payments.method.${method}`),
    [t]
  )

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return t('admin.payments.detail.notAvailable')
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString()
  }

  const formatAmount = (amount: string | null | undefined) => {
    if (!amount) return t('admin.payments.detail.notAvailable')
    const num = parseFloat(amount)
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleVerify = useCallback(async () => {
    if (!payment) return
    if (!window.confirm(t('admin.payments.actions.confirmVerify'))) return

    try {
      await verifyPayment(payment.id)
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(payment.id) })
      toast.success(t('admin.payments.actions.verifySuccess'))
    } catch {
      toast.error(t('admin.payments.actions.verifyError'))
    }
  }, [payment, queryClient, t, toast])

  const handleReject = useCallback(async () => {
    if (!payment) return
    if (!window.confirm(t('admin.payments.actions.confirmReject'))) return

    try {
      await rejectPayment(payment.id)
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(payment.id) })
      toast.success(t('admin.payments.actions.rejectSuccess'))
    } catch {
      toast.error(t('admin.payments.actions.rejectError'))
    }
  }, [payment, queryClient, t, toast])

  if (isLoading) {
    return <PaymentDetailSkeleton />
  }

  if (error || !payment) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('admin.payments.error')}
        </Typography>
        <Button
          className="mt-4"
          color="primary"
          onPress={() => router.push('/dashboard/payments')}
        >
          {t('admin.payments.actions.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            isIconOnly
            variant="light"
            onPress={() => router.push('/dashboard/payments')}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <Typography variant="h2">{t('admin.payments.detail.title')}</Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {payment.paymentNumber || payment.id}
            </Typography>
          </div>
        </div>
        {payment.status === 'pending_verification' && (
          <div className="flex gap-2">
            <Button
              color="success"
              startContent={<CheckCircle size={18} />}
              onPress={handleVerify}
            >
              {t('admin.payments.actions.verify')}
            </Button>
            <Button
              color="danger"
              variant="bordered"
              startContent={<XCircle size={18} />}
              onPress={handleReject}
            >
              {t('admin.payments.actions.reject')}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Information */}
        <DetailSection title={t('admin.payments.detail.paymentInfo')}>
          <DetailRow
            label={t('admin.payments.detail.paymentNumber')}
            value={payment.paymentNumber || t('admin.payments.detail.notAvailable')}
          />
          <DetailRow
            label={t('admin.payments.detail.status')}
          >
            <Chip color={getStatusColor(payment.status)} variant="flat">
              {t(`admin.payments.status.${payment.status}`)}
            </Chip>
          </DetailRow>
          <DetailRow
            label={t('admin.payments.detail.paymentMethod')}
            value={getPaymentMethodLabel(payment.paymentMethod)}
          />
          {payment.receiptNumber && (
            <DetailRow
              label={t('admin.payments.detail.receiptNumber')}
              value={payment.receiptNumber}
            />
          )}
        </DetailSection>

        {/* User Information */}
        <DetailSection title={t('admin.payments.detail.userInfo')}>
          <DetailRow
            label={t('admin.payments.detail.userName')}
            value={
              payment.user
                ? `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() || payment.user.email
                : t('admin.payments.detail.notAvailable')
            }
          />
          <DetailRow
            label={t('admin.payments.detail.userEmail')}
            value={payment.user?.email || t('admin.payments.detail.notAvailable')}
          />
        </DetailSection>

        {/* Unit Information */}
        <DetailSection title={t('admin.payments.detail.unitInfo')}>
          <DetailRow
            label={t('admin.payments.detail.unitName')}
            value={payment.unit?.unitNumber || t('admin.payments.detail.notAvailable')}
          />
        </DetailSection>

        {/* Amounts */}
        <DetailSection title={t('admin.payments.detail.amounts')}>
          <DetailRow
            label={t('admin.payments.detail.amount')}
            value={formatAmount(payment.amount)}
          />
          {payment.currency && (
            <DetailRow
              label={t('admin.payments.detail.currency')}
              value={`${payment.currency.name} (${payment.currency.code})`}
            />
          )}
          {payment.paidAmount && (
            <DetailRow
              label={t('admin.payments.detail.paidAmount')}
              value={formatAmount(payment.paidAmount)}
            />
          )}
          {payment.paidCurrency && (
            <DetailRow
              label={t('admin.payments.detail.paidCurrency')}
              value={`${payment.paidCurrency.name} (${payment.paidCurrency.code})`}
            />
          )}
          {payment.exchangeRate && (
            <DetailRow
              label={t('admin.payments.detail.exchangeRate')}
              value={payment.exchangeRate}
            />
          )}
        </DetailSection>

        {/* Dates */}
        <DetailSection title={t('admin.payments.detail.dates')}>
          <DetailRow
            label={t('admin.payments.detail.paymentDate')}
            value={formatDate(payment.paymentDate)}
          />
          <DetailRow
            label={t('admin.payments.detail.registeredAt')}
            value={formatDate(payment.registeredAt)}
          />
          {payment.verifiedAt && (
            <DetailRow
              label={t('admin.payments.detail.verifiedAt')}
              value={formatDate(payment.verifiedAt)}
            />
          )}
        </DetailSection>

        {/* Receipt */}
        {payment.receiptUrl && (
          <DetailSection title={t('admin.payments.detail.receipt')}>
            <div className="flex items-center gap-2">
              <a
                className="inline-flex items-center gap-1 text-primary hover:underline"
                href={payment.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('admin.payments.detail.receiptUrl')}
                <ExternalLink size={14} />
              </a>
            </div>
          </DetailSection>
        )}

        {/* Verification */}
        {(payment.verifiedBy || payment.verificationNotes) && (
          <DetailSection title={t('admin.payments.detail.verification')}>
            {payment.verifiedByUser && (
              <DetailRow
                label={t('admin.payments.detail.verifiedBy')}
                value={
                  `${payment.verifiedByUser.firstName || ''} ${payment.verifiedByUser.lastName || ''}`.trim() ||
                  payment.verifiedByUser.email
                }
              />
            )}
            {payment.verificationNotes && (
              <DetailRow
                label={t('admin.payments.detail.verificationNotes')}
                value={payment.verificationNotes}
              />
            )}
          </DetailSection>
        )}

        {/* Notes */}
        {payment.notes && (
          <DetailSection title={t('admin.payments.detail.notes')}>
            <p className="text-sm text-default-700">{payment.notes}</p>
          </DetailSection>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div>
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="mt-2 h-4 w-32 rounded" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
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
