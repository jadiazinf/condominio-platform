'use client'

import { Receipt } from 'lucide-react'
import { useBillingCharges } from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'

import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'

type TChargeRow = {
  id: string
  description: string | null
  amount: string
  balance: string
  status: string
  isCredit: boolean
  periodYear: number
  periodMonth: number
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  paid: 'success',
  partial: 'primary',
  cancelled: 'danger',
  exonerated: 'default',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  partial: 'Parcial',
  cancelled: 'Cancelado',
  exonerated: 'Exonerado',
}

export function BillingChargesListClient() {
  const { data, isLoading } = useBillingCharges({})
  const charges = data?.data ?? []

  const rows: TChargeRow[] = charges.map(c => ({
    id: c.id,
    description: c.description,
    amount: c.amount,
    balance: c.balance,
    status: c.status,
    isCredit: c.isCredit,
    periodYear: c.periodYear,
    periodMonth: c.periodMonth,
  }))

  const columns: ITableColumn<TChargeRow>[] = [
    { key: 'description', label: 'Descripcion' },
    { key: 'period', label: 'Periodo', width: 100 },
    { key: 'amount', label: 'Monto', align: 'end' as const, width: 130 },
    { key: 'balance', label: 'Saldo', align: 'end' as const, width: 130 },
    { key: 'status', label: 'Estado', width: 110 },
  ]

  const renderCell = (row: TChargeRow, key: string) => {
    switch (key) {
      case 'description':
        return (
          <div>
            <span className={row.isCredit ? 'text-green-600' : ''}>
              {row.isCredit ? '(-) ' : ''}{row.description ?? '-'}
            </span>
          </div>
        )
      case 'period':
        return `${String(row.periodMonth).padStart(2, '0')}/${row.periodYear}`
      case 'amount':
        return <span className={row.isCredit ? 'text-green-600' : ''}>{formatAmount(row.amount)}</span>
      case 'balance':
        return <span className="font-semibold">{formatAmount(row.balance)}</span>
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
        <Typography variant="h2">Cargos</Typography>
        <Typography className="mt-1" color="muted">
          Todos los cargos generados por los canales de cobro
        </Typography>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <Receipt className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">No hay cargos registrados</Typography>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <Table aria-label="tabla" columns={columns} rows={rows} renderCell={renderCell} />
      )}
    </div>
  )
}
