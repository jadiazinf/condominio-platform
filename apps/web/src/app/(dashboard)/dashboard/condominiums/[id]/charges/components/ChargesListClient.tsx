'use client'

import { Receipt } from 'lucide-react'
import { useBillingCharges } from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'
import { useTranslation } from '@/contexts'

import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Tooltip } from '@/ui/components/tooltip'

// ─── Types ───

type TChargeRow = {
  id: string
  description: string
  periodYear: number
  periodMonth: number
  amount: string
  status: string
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  partial: 'primary',
  paid: 'success',
  cancelled: 'danger',
  exonerated: 'default',
}

const MONTHS = [
  '',
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

// ─── Component ───

export function ChargesListClient() {
  const { t } = useTranslation()
  const { data, isLoading } = useBillingCharges({})

  // Filter charges with no receipt (independent charges)
  const allCharges = data?.data ?? []
  const charges = allCharges.filter((c: any) => !c.receiptId)

  const rows: TChargeRow[] = charges.map((c: any) => ({
    id: c.id,
    description: c.description ?? c.chargeTypeName ?? '-',
    periodYear: c.periodYear,
    periodMonth: c.periodMonth,
    amount: c.amount,
    status: c.status,
  }))

  const columns: ITableColumn<TChargeRow>[] = [
    { key: 'description', label: t('admin.charges.description') },
    { key: 'period', label: t('admin.charges.period'), width: 120 },
    { key: 'amount', label: t('admin.charges.amount'), align: 'end' as const, width: 150 },
    { key: 'status', label: t('admin.charges.status'), width: 110 },
  ]

  const renderCell = (row: TChargeRow, key: string) => {
    switch (key) {
      case 'description':
        return <span className="text-sm font-medium">{row.description}</span>
      case 'period':
        return `${MONTHS[row.periodMonth]} ${row.periodYear}`
      case 'amount':
        return <span className="font-semibold">{formatAmount(row.amount)}</span>
      case 'status':
        return (
          <Chip color={STATUS_COLORS[row.status] ?? 'default'} size="sm">
            {t(`admin.billingCharges.statuses.${row.status}`) ?? row.status}
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
          <Typography variant="h2">{t('admin.charges.title')}</Typography>
          <Typography className="mt-1" color="muted">
            {t('admin.charges.subtitle')}
          </Typography>
        </div>
        <Tooltip content={t('admin.charges.comingSoon')}>
          <Button color="primary" isDisabled>
            {t('admin.charges.create')}
          </Button>
        </Tooltip>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <Receipt className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">{t('admin.charges.empty')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.charges.emptyDescription')}
          </Typography>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <Table aria-label="charges" columns={columns} rows={rows} renderCell={renderCell} />
      )}
    </div>
  )
}
