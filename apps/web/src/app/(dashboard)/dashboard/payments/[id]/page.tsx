'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import {
  usePaymentDetail,
  verifyPayment,
  rejectPayment,
  refundPayment,
  paymentKeys,
  useQueryClient,
} from '@packages/http-client'

import { ConvertedAmount } from '@/ui/components/currency/ConvertedAmount'
import { getPaymentStatusColor } from '@/utils/status-colors'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Skeleton } from '@/ui/components/skeleton'
import { Textarea } from '@/ui/components/textarea'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@/ui/components/modal'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Data fetching
  const { data, isLoading, error } = usePaymentDetail(id)
  const payment = data?.data

  // Modals
  const refundModal = useDisclosure()

  // Form state
  const [refundReason, setRefundReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Helpers
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

  const getPaymentMethodLabel = useCallback(
    (method: string) => t(`admin.payments.method.${method}`),
    [t]
  )

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: paymentKeys.all })
    queryClient.invalidateQueries({ queryKey: paymentKeys.detail(id) })
  }, [queryClient, id])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleVerify = useCallback(async () => {
    if (!payment) return
    if (!window.confirm(t('admin.payments.actions.confirmVerify'))) return

    try {
      await verifyPayment(payment.id)
      invalidateAll()
      toast.success(t('admin.payments.actions.verifySuccess'))
    } catch {
      toast.error(t('admin.payments.actions.verifyError'))
    }
  }, [payment, invalidateAll, t, toast])

  const handleReject = useCallback(async () => {
    if (!payment) return
    if (!window.confirm(t('admin.payments.actions.confirmReject'))) return

    try {
      await rejectPayment(payment.id)
      invalidateAll()
      toast.success(t('admin.payments.actions.rejectSuccess'))
    } catch {
      toast.error(t('admin.payments.actions.rejectError'))
    }
  }, [payment, invalidateAll, t, toast])

  const handleRefund = useCallback(async () => {
    if (!payment || !refundReason.trim()) return

    setIsSubmitting(true)
    try {
      await refundPayment(payment.id, { refundReason: refundReason.trim() })
      invalidateAll()
      toast.success(t('admin.payments.actions.refundSuccess'))
      refundModal.onClose()
      setRefundReason('')
    } catch {
      toast.error(t('admin.payments.actions.refundError'))
    } finally {
      setIsSubmitting(false)
    }
  }, [payment, refundReason, invalidateAll, t, toast, refundModal])

  // ── Loading / Error ─────────────────────────────────────────────────────────

  if (isLoading) return <PaymentDetailSkeleton />

  if (error || !payment) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('admin.payments.error')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => router.push('/dashboard/payments')}>
          {t('admin.payments.actions.back')}
        </Button>
      </div>
    )
  }

  const isCompleted = payment.status === 'completed'
  const isPendingVerification = payment.status === 'pending_verification'
  const isAutoVerified = payment.verifiedBy === '00000000-0000-0000-0000-000000000000'

  return (
    <div className="space-y-6">
      {/* Auto-verified banner */}
      {isAutoVerified && (
        <div className="flex items-center gap-3 rounded-lg border border-success-200 bg-success-50 p-4">
          <ShieldCheck className="shrink-0 text-success" size={20} />
          <div>
            <p className="text-sm font-medium text-success-700">
              {t('admin.payments.detail.autoVerified')}
            </p>
            <p className="text-xs text-success-600">
              {t('admin.payments.detail.autoVerifiedDescription')}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button isIconOnly variant="light" onPress={() => router.push('/dashboard/payments')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <Typography variant="h2">{t('admin.payments.detail.title')}</Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {payment.paymentNumber || payment.id}
            </Typography>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPendingVerification && (
            <>
              <Button
                color="success"
                startContent={<CheckCircle size={18} />}
                onPress={handleVerify}
              >
                {t('admin.payments.actions.verify')}
              </Button>
              <Button
                color="danger"
                startContent={<XCircle size={18} />}
                variant="bordered"
                onPress={handleReject}
              >
                {t('admin.payments.actions.reject')}
              </Button>
            </>
          )}
          {isCompleted && (
            <Button
              color="warning"
              startContent={<RotateCcw size={18} />}
              variant="bordered"
              onPress={refundModal.onOpen}
            >
              {t('admin.payments.actions.refund')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Information */}
        <DetailSection title={t('admin.payments.detail.paymentInfo')}>
          <DetailRow
            label={t('admin.payments.detail.paymentNumber')}
            value={payment.paymentNumber || t('admin.payments.detail.notAvailable')}
          />
          <DetailRow label={t('admin.payments.detail.status')}>
            <Chip color={getPaymentStatusColor(payment.status)} variant="flat">
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
                ? `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() ||
                  payment.user.email
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
          <DetailRow label={t('admin.payments.detail.amount')}>
            <ConvertedAmount
              amount={payment.amount}
              currencyCode={payment.currency?.code}
              currencySymbol={payment.currency?.symbol}
              isBaseCurrency={payment.currency?.isBaseCurrency}
            />
          </DetailRow>
          {payment.currency && (
            <DetailRow
              label={t('admin.payments.detail.currency')}
              value={`${payment.currency.name} (${payment.currency.code})`}
            />
          )}
          {payment.paidAmount && (
            <DetailRow label={t('admin.payments.detail.paidAmount')}>
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
                rel="noopener noreferrer"
                target="_blank"
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
            <DetailRow label={t('admin.payments.detail.verifiedBy')}>
              {isAutoVerified ? (
                <Chip
                  color="success"
                  size="sm"
                  startContent={<ShieldCheck size={12} />}
                  variant="flat"
                >
                  {t('admin.payments.detail.verifiedBySystem')}
                </Chip>
              ) : payment.verifiedByUser ? (
                <span className="text-sm font-medium">
                  {`${payment.verifiedByUser.firstName || ''} ${payment.verifiedByUser.lastName || ''}`.trim() ||
                    payment.verifiedByUser.email}
                </span>
              ) : (
                <span className="text-sm font-medium">
                  {t('admin.payments.detail.notAvailable')}
                </span>
              )}
            </DetailRow>
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

      {/* ── Modal: Refund Payment ─────────────────────────────────────────── */}
      <Modal isOpen={refundModal.isOpen} size="md" onOpenChange={refundModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>{t('admin.payments.actions.refund')}</ModalHeader>
          <ModalBody>
            <Textarea
              isRequired
              label={t('admin.payments.actions.refundReason')}
              minRows={3}
              placeholder={t('admin.payments.actions.refundReasonPlaceholder')}
              value={refundReason}
              onValueChange={setRefundReason}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={refundModal.onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              color="warning"
              isDisabled={!refundReason.trim()}
              isLoading={isSubmitting}
              onPress={handleRefund}
            >
              {t('admin.payments.actions.refund')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAllocationStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'warning' as const
    case 'allocated':
      return 'success' as const
    case 'refunded':
      return 'default' as const
    case 'refund_pending':
      return 'secondary' as const
    case 'refund_failed':
      return 'danger' as const
    default:
      return 'default' as const
  }
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
