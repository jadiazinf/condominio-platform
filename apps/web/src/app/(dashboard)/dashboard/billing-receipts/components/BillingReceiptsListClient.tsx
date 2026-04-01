'use client'

import { useRouter } from 'next/navigation'
import { FileText, Download } from 'lucide-react'
import { useBillingReceipts } from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'

import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  issued: 'Emitido',
  paid: 'Pagado',
  partial: 'Parcial',
  voided: 'Anulado',
}

const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function BillingReceiptsListClient() {
  const router = useRouter()
  const { data, isLoading } = useBillingReceipts({})
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
    { key: 'receiptNumber', label: 'N° Recibo' },
    { key: 'period', label: 'Periodo', width: 120 },
    { key: 'totalAmount', label: 'Total', align: 'end' as const, width: 150 },
    { key: 'dueDate', label: 'Vencimiento', width: 120 },
    { key: 'status', label: 'Estado', width: 110 },
  ]

  const renderCell = (row: TReceiptRow, key: string) => {
    switch (key) {
      case 'receiptNumber':
        return (
          <button
            className="text-left font-mono text-sm font-medium text-blue-600 hover:underline"
            onClick={() => router.push(`/dashboard/billing-receipts/${row.id}`)}
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
            {STATUS_LABELS[row.status] ?? row.status}
          </Chip>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h2">Recibos</Typography>
        <Typography className="mt-1" color="muted">
          Recibos generados por los canales de cobro
        </Typography>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <FileText className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">No hay recibos generados</Typography>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <Table aria-label="tabla" columns={columns} rows={rows} renderCell={renderCell} />
      )}
    </div>
  )
}
