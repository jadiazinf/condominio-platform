'use client'

import { useParams, useRouter } from 'next/navigation'
import { useExpenseDetail } from '@packages/http-client'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { ArrowLeft } from 'lucide-react'

const STATUS_COLOR_MAP: Record<string, 'warning' | 'success' | 'danger' | 'primary' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  paid: 'primary',
}

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()

  const { data, isLoading, error } = useExpenseDetail(params.id)
  const expense = data?.data

  const formatCurrency = (value: number | string, symbol?: string | null) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    const currencySymbol = symbol || '$'
    return `${currencySymbol}${num.toFixed(2)}`
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="space-y-4">
        <Button
          variant="light"
          startContent={<ArrowLeft size={16} />}
          onPress={() => router.push('/dashboard/expenses')}
        >
          {t('admin.expenses.actions.backToList')}
        </Button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
          <Typography color="danger" variant="body1">
            {t('common.retry')}
          </Typography>
        </div>
      </div>
    )
  }

  const currencySymbol = expense.currency?.symbol

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-4">
        <Button
          variant="light"
          startContent={<ArrowLeft size={16} />}
          onPress={() => router.push('/dashboard/expenses')}
        >
          {t('admin.expenses.actions.backToList')}
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('admin.expenses.detail.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {expense.description}
          </Typography>
        </div>
        <Chip
          color={STATUS_COLOR_MAP[expense.status] || 'default'}
          variant="flat"
          size="lg"
        >
          {t(`admin.expenses.status.${expense.status}`)}
        </Chip>
      </div>

      {/* Description & Category */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.expenses.detail.descriptionInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.expenses.table.description')}
            </Typography>
            <Typography variant="body1">
              {expense.description}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.expenses.table.category')}
            </Typography>
            <Typography variant="body1">
              {expense.expenseCategory?.name ?? '-'}
            </Typography>
          </div>
          {expense.condominium?.name && (
            <div>
              <Typography color="muted" variant="body2">
                {t('admin.expenses.detail.condominium')}
              </Typography>
              <Typography variant="body1">
                {expense.condominium.name}
              </Typography>
            </div>
          )}
        </div>
      </div>

      {/* Amount & Currency */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.expenses.detail.amountInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.expenses.table.amount')}
            </Typography>
            <Typography variant="body1" className="font-semibold">
              {formatCurrency(expense.amount, currencySymbol)}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.expenses.detail.currency')}
            </Typography>
            <Typography variant="body1">
              {expense.currency?.code ?? '-'}
            </Typography>
          </div>
        </div>
      </div>

      {/* Vendor Information */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.expenses.detail.vendorInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.expenses.table.vendor')}
            </Typography>
            <Typography variant="body1">
              {expense.vendorName ?? '-'}
            </Typography>
          </div>
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.expenses.detail.invoiceNumber')}
            </Typography>
            <Typography variant="body1">
              {expense.invoiceNumber ?? '-'}
            </Typography>
          </div>
        </div>
      </div>

      {/* Date Information */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.expenses.detail.dateInfo')}
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography color="muted" variant="body2">
              {t('admin.expenses.detail.expenseDate')}
            </Typography>
            <Typography variant="body1">
              {formatDate(expense.expenseDate)}
            </Typography>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.expenses.detail.statusInfo')}
        </Typography>
        <Chip
          color={STATUS_COLOR_MAP[expense.status] || 'default'}
          variant="flat"
          size="lg"
        >
          {t(`admin.expenses.status.${expense.status}`)}
        </Chip>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-default-200 p-6">
        <Typography variant="h4" className="mb-4">
          {t('admin.expenses.detail.notes')}
        </Typography>
        <Typography variant="body1" color={expense.notes ? undefined : 'muted'}>
          {expense.notes ?? t('admin.expenses.detail.noNotes')}
        </Typography>
      </div>
    </div>
  )
}
