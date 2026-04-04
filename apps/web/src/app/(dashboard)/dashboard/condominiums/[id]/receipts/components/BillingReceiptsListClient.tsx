'use client'

import { useRouter } from 'next/navigation'
import { FileText, Plus } from 'lucide-react'
import { useBillingReceipts } from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'
import { useTranslation } from '@/contexts'

import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'

type TReceiptRow = {
  id: string
  receiptNumber: string
  periodYear: number
  periodMonth: number
  status: string
  totalAmount: string
  dueDate: string | null
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  draft: 'default',
  issued: 'primary',
  paid: 'success',
  partial: 'warning',
  voided: 'danger',
}

const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface BillingReceiptsListClientProps {
  condominiumId: string
}

export function BillingReceiptsListClient({ condominiumId }: BillingReceiptsListClientProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, isLoading } = useBillingReceipts({ condominiumId })
  const receipts = data?.data ?? []

  const rows: TReceiptRow[] = receipts.map(r => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    periodYear: r.periodYear,
    periodMonth: r.periodMonth,
    status: r.status,
    totalAmount: r.totalAmount,
    dueDate: r.dueDate,
  }))

  const columns: ITableColumn<TReceiptRow>[] = [
    { key: 'receiptNumber', label: t('admin.billingReceipts.receiptNumber') },
    { key: 'period', label: t('admin.billingReceipts.period'), width: 120 },
    { key: 'totalAmount', label: t('admin.billingReceipts.total'), align: 'end' as const, width: 150 },
    { key: 'dueDate', label: t('admin.billingReceipts.dueDate'), width: 120 },
    { key: 'status', label: t('admin.billingReceipts.status'), width: 110 },
  ]

  const renderCell = (row: TReceiptRow, key: string) => {
    switch (key) {
      case 'receiptNumber':
        return (
          <button
            className="text-left font-mono text-sm font-medium text-blue-600 hover:underline"
            onClick={() => router.push(`/dashboard/condominiums/${condominiumId}/receipts/${row.id}`)}
          >
            {row.receiptNumber}
          </button>
        )
      case 'period':
        return `${MONTHS[row.periodMonth]} ${row.periodYear}`
      case 'totalAmount':
        return <span className="font-semibold">{formatAmount(row.totalAmount)}</span>
      case 'dueDate':
        return row.dueDate ?? '-'
      case 'status':
        return (
          <Chip color={STATUS_COLORS[row.status] ?? 'default'} size="sm">
            {t(`admin.billingReceipts.statuses.${row.status}`) ?? row.status}
          </Chip>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h2">{t('admin.billingReceipts.title')}</Typography>
          <Typography className="mt-1" color="muted">
            {t('admin.billingReceipts.subtitle')}
          </Typography>
        </div>
        <Button
          color="primary"
          startContent={<Plus size={16} />}
          onPress={() => router.push(`/dashboard/generate-receipt/${condominiumId}`)}
        >
          {t('admin.billingReceipts.generate')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <FileText className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">{t('admin.billingReceipts.empty')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.billingReceipts.emptyDescription')}
          </Typography>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <Table aria-label="tabla" columns={columns} rows={rows} renderCell={renderCell} />
      )}
    </div>
  )
}
