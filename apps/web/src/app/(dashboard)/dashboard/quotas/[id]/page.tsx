'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuotaDetail } from '@packages/http-client'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { ArrowLeft } from 'lucide-react'

const STATUS_COLOR_MAP: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  pending: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'default',
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export default function QuotaDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()

  const { data, isLoading, error } = useQuotaDetail(params.id)
  const quota = data?.data

  const formatCurrency = (value: number | string, symbol?: string | null) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    const currencySymbol = symbol || '$'
    return `${currencySymbol}${num.toFixed(2)}`
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString()
  }

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
          variant="light"
          startContent={<ArrowLeft size={16} />}
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

  const currencySymbol = quota.currency?.symbol

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-4">
        <Button
          variant="light"
          startContent={<ArrowLeft size={16} />}
          onPress={() => router.push('/dashboard/quotas')}
        >
          {t('admin.quotas.actions.backToList')}
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('admin.quotas.detail.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {quota.paymentConcept?.name ?? '-'} - {formatPeriod(quota.periodYear, quota.periodMonth)}
          </Typography>
        </div>
        <Chip
          color={STATUS_COLOR_MAP[quota.status] || 'default'}
          variant="flat"
          size="lg"
        >
          {t(`admin.quotas.status.${quota.status}`)}
        </Chip>
      </div>

      {/* Unit Information */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.quotas.detail.unitInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.table.unit')}
            </Typography>
            <Typography variant="body1">
              {quota.unit?.unitNumber ?? '-'}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.table.concept')}
            </Typography>
            <Typography variant="body1">
              {quota.paymentConcept?.name ?? '-'}
            </Typography>
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
              <Typography variant="body1">
                {quota.periodDescription}
              </Typography>
            </div>
          )}
        </div>
      </div>

      {/* Amount Information */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.quotas.detail.amountInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.baseAmount')}
            </Typography>
            <Typography variant="body1" className="font-semibold">
              {formatCurrency(quota.baseAmount, currencySymbol)}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.interestAmount')}
            </Typography>
            <Typography variant="body1" className="font-semibold">
              {formatCurrency(quota.interestAmount, currencySymbol)}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.paidAmount')}
            </Typography>
            <Typography variant="body1" className="font-semibold text-success">
              {formatCurrency(quota.paidAmount, currencySymbol)}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.balance')}
            </Typography>
            <Typography variant="body1" className="font-semibold">
              {formatCurrency(quota.balance, currencySymbol)}
            </Typography>
          </div>
        </div>
      </div>

      {/* Date Information */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.quotas.detail.dateInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.issueDate')}
            </Typography>
            <Typography variant="body1">
              {formatDate(quota.issueDate)}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.quotas.detail.dueDate')}
            </Typography>
            <Typography variant="body1">
              {formatDate(quota.dueDate)}
            </Typography>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.quotas.detail.notes')}
        </Typography>
        <Typography variant="body1" color={quota.notes ? undefined : 'muted'}>
          {quota.notes ?? t('admin.quotas.detail.noNotes')}
        </Typography>
      </div>
    </div>
  )
}
