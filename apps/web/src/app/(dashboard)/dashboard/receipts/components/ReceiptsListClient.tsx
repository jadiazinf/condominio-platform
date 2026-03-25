'use client'

import type { TCondominiumReceipt } from '@packages/domain'

import { useRouter } from 'next/navigation'
import { FileSpreadsheet, FilePlus2 } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { useReceipts } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ITranslations {
  title: string
  subtitle: string
  generate: string
  bulkGenerate: string
  empty: string
  loading: string
  table: {
    receiptNumber: string
    unit: string
    period: string
    totalAmount: string
    status: string
  }
  statuses: Record<string, string>
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> =
  {
    draft: 'default',
    generated: 'primary',
    sent: 'success',
    voided: 'danger',
  }

type TReceiptRow = TCondominiumReceipt & { id: string }

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ReceiptsListClient({ translations: t }: { translations: ITranslations }) {
  const router = useRouter()
  const { data, isLoading } = useReceipts()
  const receipts = data?.data ?? []

  const rows: TReceiptRow[] = receipts.map((r: TCondominiumReceipt) => ({ ...r, id: r.id }))

  const columns: ITableColumn<TReceiptRow>[] = [
    { key: 'receiptNumber', label: t.table.receiptNumber },
    { key: 'period', label: t.table.period, width: 120 },
    { key: 'totalAmount', label: t.table.totalAmount, align: 'end' as const, width: 150 },
    { key: 'status', label: t.table.status, width: 120 },
  ]

  const renderCell = (row: TReceiptRow, key: string) => {
    switch (key) {
      case 'receiptNumber':
        return (
          <button
            className="text-left font-medium text-blue-600 hover:underline"
            onClick={() => router.push(`/dashboard/receipts/${row.id}`)}
          >
            {row.receiptNumber}
          </button>
        )
      case 'period':
        return `${String(row.periodMonth).padStart(2, '0')}/${row.periodYear}`
      case 'totalAmount':
        return <span className="font-semibold">{formatAmount(row.totalAmount)}</span>
      case 'status':
        return (
          <Chip color={STATUS_CHIP_COLOR[row.status] ?? 'default'} size="sm">
            {t.statuses[row.status] ?? row.status}
          </Chip>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t.title}</Typography>
          <Typography className="mt-1" color="muted">
            {t.subtitle}
          </Typography>
        </div>
        <Button
          className="w-full sm:w-auto"
          color="primary"
          startContent={<FilePlus2 className="h-4 w-4" />}
          onPress={() => router.push('/dashboard/receipts/generate')}
        >
          {t.generate}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <Typography className="ml-3" color="muted">
            {t.loading}
          </Typography>
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <FileSpreadsheet className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">{t.empty}</Typography>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <Table
          fullWidth
          aria-label="receipts-list"
          columns={columns}
          renderCell={renderCell}
          rows={rows}
        />
      )}
    </div>
  )
}
