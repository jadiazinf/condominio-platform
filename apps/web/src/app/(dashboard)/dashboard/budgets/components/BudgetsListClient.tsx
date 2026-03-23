'use client'

import type { TBudget } from '@packages/domain'

import { useRouter } from 'next/navigation'
import { Plus, FileText } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { useBudgets } from '@packages/http-client'

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
  create: string
  empty: string
  loading: string
  table: {
    name: string
    type: string
    period: string
    totalAmount: string
    status: string
    actions: string
  }
  statuses: Record<string, string>
  types: Record<string, string>
}

interface IBudgetsListClientProps {
  translations: ITranslations
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  draft: 'default',
  approved: 'primary',
  active: 'success',
  closed: 'warning',
}

function formatPeriod(year: number, month: number | null, type: string): string {
  if (type === 'annual' || month === null) return `${year}`

  return `${String(month).padStart(2, '0')}/${year}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type TBudgetRow = TBudget & { id: string }

export function BudgetsListClient({ translations: t }: IBudgetsListClientProps) {
  const router = useRouter()
  const { data, isLoading } = useBudgets()
  const budgets = data?.data ?? []

  const rows: TBudgetRow[] = budgets.map((b: TBudget) => ({ ...b, id: b.id }))

  const columns: ITableColumn<TBudgetRow>[] = [
    { key: 'name', label: t.table.name },
    { key: 'budgetType', label: t.table.type, width: 120 },
    { key: 'period', label: t.table.period, width: 120 },
    { key: 'totalAmount', label: t.table.totalAmount, align: 'end' as const, width: 150 },
    { key: 'status', label: t.table.status, width: 120 },
  ]

  const renderCell = (row: TBudgetRow, key: string) => {
    switch (key) {
      case 'name':
        return (
          <button
            className="text-left font-medium text-blue-600 hover:underline"
            onClick={() => router.push(`/dashboard/budgets/${row.id}`)}
          >
            {row.name}
          </button>
        )
      case 'budgetType':
        return t.types[row.budgetType] ?? row.budgetType
      case 'period':
        return formatPeriod(row.periodYear, row.periodMonth, row.budgetType)
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
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h2">{t.title}</Typography>
          <Typography className="mt-1" color="muted">
            {t.subtitle}
          </Typography>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="h-4 w-4" />}
          onPress={() => router.push('/dashboard/budgets/create')}
        >
          {t.create}
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-3 h-12 w-12 text-gray-300" />
          <Typography color="muted">{t.empty}</Typography>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <Table
          fullWidth
          aria-label="budgets-list"
          columns={columns}
          renderCell={renderCell}
          rows={rows}
        />
      )}
    </div>
  )
}
