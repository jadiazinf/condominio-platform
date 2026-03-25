'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Scale } from 'lucide-react'
import { useBankReconciliations, type IBankReconciliation } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ITranslations {
  title: string
  subtitle: string
  importBtn: string
  newReconciliation: string
  empty: string
  loading: string
  tabs: { imports: string; reconciliations: string }
  importsTable: {
    filename: string
    period: string
    entries: string
    credits: string
    debits: string
    status: string
  }
  reconciliationsTable: {
    period: string
    matched: string
    unmatched: string
    ignored: string
    status: string
  }
  statuses: Record<string, string>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> =
  {
    processing: 'warning',
    completed: 'success',
    failed: 'danger',
    in_progress: 'primary',
    cancelled: 'default',
  }

// ─── Component ───────────────────────────────────────────────────────────────

export function BankReconciliationClient({ translations: t }: { translations: ITranslations }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'reconciliations'>('reconciliations')
  const { data: reconData, isLoading: reconLoading } = useBankReconciliations()
  const reconciliations: IBankReconciliation[] = reconData?.data ?? []

  type TReconRow = IBankReconciliation & { id: string }
  const reconRows: TReconRow[] = reconciliations.map((r: IBankReconciliation) => ({
    ...r,
    id: r.id,
  }))

  const reconColumns: ITableColumn<TReconRow>[] = [
    { key: 'period', label: t.reconciliationsTable.period },
    { key: 'matched', label: t.reconciliationsTable.matched, width: 100, align: 'center' as const },
    {
      key: 'unmatched',
      label: t.reconciliationsTable.unmatched,
      width: 110,
      align: 'center' as const,
    },
    { key: 'ignored', label: t.reconciliationsTable.ignored, width: 100, align: 'center' as const },
    { key: 'status', label: t.reconciliationsTable.status, width: 140 },
  ]

  const renderReconCell = (row: TReconRow, key: string | number | symbol) => {
    switch (String(key)) {
      case 'period': {
        const from = new Date(row.periodFrom).toLocaleDateString()
        const to = new Date(row.periodTo).toLocaleDateString()

        return (
          <button
            className="text-left font-medium text-blue-600 hover:underline"
            onClick={() => router.push(`/dashboard/bank-reconciliation/imports/${row.id}`)}
          >
            {from} - {to}
          </button>
        )
      }
      case 'matched':
        return <span className="font-semibold text-green-600">{row.totalMatched}</span>
      case 'unmatched':
        return (
          <span className={`font-semibold ${row.totalUnmatched > 0 ? 'text-orange-600' : ''}`}>
            {row.totalUnmatched}
          </span>
        )
      case 'ignored':
        return <span className="text-gray-500">{row.totalIgnored}</span>
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
          startContent={<Upload className="h-4 w-4" />}
          onPress={() => router.push('/dashboard/bank-reconciliation/import')}
        >
          {t.importBtn}
        </Button>
      </div>

      {reconLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <Typography className="ml-3" color="muted">
            {t.loading}
          </Typography>
        </div>
      )}

      {!reconLoading && reconRows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <Scale className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">{t.empty}</Typography>
        </div>
      )}

      {!reconLoading && reconRows.length > 0 && (
        <Table
          fullWidth
          aria-label="reconciliations-list"
          columns={reconColumns}
          renderCell={renderReconCell}
          rows={reconRows}
        />
      )}
    </div>
  )
}
