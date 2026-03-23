'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuotaDetail, useCancelQuota } from '@packages/http-client'
import { ArrowLeft, Ban } from 'lucide-react'
import { formatCurrency } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Textarea } from '@/ui/components/textarea'
import { useToast } from '@/ui/components/toast'

const STATUS_COLOR_MAP: Record<
  string,
  'warning' | 'success' | 'danger' | 'default' | 'secondary' | 'primary'
> = {
  pending: 'warning',
  partial: 'primary',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'default',
  exonerated: 'secondary',
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const CANCELLABLE_STATUSES = new Set(['pending', 'partial', 'overdue'])

export default function QuotaDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const toast = useToast()

  const { data, isLoading, error } = useQuotaDetail(params.id)
  const quota = data?.data

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const cancelMutation = useCancelQuota(params.id, {
    onSuccess: () => {
      toast.success(t('admin.quotas.actions.cancelSuccess'))
      setShowCancelModal(false)
      setCancelReason('')
      router.push('/dashboard/quotas')
    },
    onError: () => {
      toast.error(t('admin.quotas.actions.cancelError'))
    },
  })

  const handleCancel = () => {
    if (cancelReason.length < 10) return
    cancelMutation.mutate({ reason: cancelReason })
  }

  const canCancel = quota && CANCELLABLE_STATUSES.has(quota.status)

  const formatPeriod = (year: number, month: number | null) => {
    if (month && month >= 1 && month <= 12) {
      return `${MONTH_NAMES[month - 1]} ${year}`
    }

    return `${year}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !quota) {
    return (
      <div className="space-y-4">
        <Button
          startContent={<ArrowLeft size={16} />}
          variant="light"
          onPress={() => router.push('/dashboard/quotas')}
        >
          {t('admin.quotas.actions.backToList')}
        </Button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
          <Typography color="danger" variant="body1">
            {t('common.retry')}
          </Typography>
        </div>
      </div>
    )
  }

  const currencyCode = quota.currency?.code

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-4">
        <Button
          startContent={<ArrowLeft size={16} />}
          variant="light"
          onPress={() => router.push('/dashboard/quotas')}
        >
          {t('admin.quotas.actions.backToList')}
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('admin.quotas.detail.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {quota.paymentConcept?.name ?? '-'} -{' '}
            {formatPeriod(quota.periodYear, quota.periodMonth)}
          </Typography>
        </div>
        <div className="flex items-center gap-3">
          <Chip color={STATUS_COLOR_MAP[quota.status] || 'default'} size="lg" variant="flat">
            {t(`admin.quotas.status.${quota.status}`)}
          </Chip>
          {canCancel && (
            <Button
              color="danger"
              startContent={<Ban size={16} />}
              variant="flat"
              onPress={() => setShowCancelModal(true)}
            >
              {t('admin.quotas.actions.cancel')}
            </Button>
          )}
        </div>
      </div>

      {/* Unit Information */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography className="mb-4" variant="h4">
          {t('admin.quotas.detail.unitInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.table.unit')}
            </Typography>
            <Typography variant="body1">{quota.unit?.unitNumber ?? '-'}</Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.table.concept')}
            </Typography>
            <Typography variant="body1">{quota.paymentConcept?.name ?? '-'}</Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.period')}
            </Typography>
            <Typography variant="body1">
              {formatPeriod(quota.periodYear, quota.periodMonth)}
            </Typography>
          </div>
          {quota.periodDescription && (
            <div>
              <Typography color="muted" variant="body2">
                {t('admin.quotas.table.concept')}
              </Typography>
              <Typography variant="body1">{quota.periodDescription}</Typography>
            </div>
          )}
        </div>
      </div>

      {/* Amount Information */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography className="mb-4" variant="h4">
          {t('admin.quotas.detail.amountInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.baseAmount')}
            </Typography>
            <Typography className="font-semibold" variant="body1">
              {formatCurrency(quota.baseAmount, { currency: currencyCode })}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.interestAmount')}
            </Typography>
            <Typography className="font-semibold" variant="body1">
              {formatCurrency(quota.interestAmount, { currency: currencyCode })}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.paidAmount')}
            </Typography>
            <Typography className="font-semibold text-success" variant="body1">
              {formatCurrency(quota.paidAmount, { currency: currencyCode })}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.balance')}
            </Typography>
            <Typography className="font-semibold" variant="body1">
              {formatCurrency(quota.balance, { currency: currencyCode })}
            </Typography>
          </div>
        </div>
      </div>

      {/* Date Information */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography className="mb-4" variant="h4">
          {t('admin.quotas.detail.dateInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.issueDate')}
            </Typography>
            <Typography variant="body1">{formatShortDate(quota.issueDate)}</Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.dueDate')}
            </Typography>
            <Typography variant="body1">{formatShortDate(quota.dueDate)}</Typography>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography className="mb-4" variant="h4">
          {t('admin.quotas.detail.notes')}
        </Typography>
        <Typography color={quota.notes ? undefined : 'muted'} variant="body1">
          {quota.notes ?? t('admin.quotas.detail.noNotes')}
        </Typography>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setCancelReason('')
        }}
      >
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">{t('admin.quotas.actions.cancelTitle')}</Typography>
          </ModalHeader>
          <ModalBody>
            <Typography className="mb-4" color="muted" variant="body2">
              {t('admin.quotas.actions.cancelWarning')}
            </Typography>
            <Textarea
              label={t('admin.quotas.actions.cancelReasonLabel')}
              minRows={3}
              placeholder={t('admin.quotas.actions.cancelReasonPlaceholder')}
              value={cancelReason}
              onValueChange={setCancelReason}
            />
            {cancelReason.length > 0 && cancelReason.length < 10 && (
              <Typography color="danger" variant="caption">
                {t('admin.quotas.actions.cancelReasonMinLength')}
              </Typography>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => {
                setShowCancelModal(false)
                setCancelReason('')
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              color="danger"
              isDisabled={cancelReason.length < 10}
              isLoading={cancelMutation.isPending}
              onPress={handleCancel}
            >
              {t('admin.quotas.actions.confirmCancel')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
