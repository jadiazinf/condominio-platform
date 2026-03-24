'use client'

import type { IAccountStatementData, IAccountStatementLineItem } from '@packages/http-client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { FileText } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'
import { useAccountStatement } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Select, type ISelectItem } from '@/ui/components/select'
import { DatePicker } from '@/ui/components/date-picker'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IUnit {
  id: string
  unitNumber: string
  buildingName: string
  condominiumId: string
  condominiumName: string
}

interface ITranslations {
  title: string
  subtitle: string
  selectUnit: string
  from: string
  to: string
  search: string
  loading: string
  error: string
  empty: string
  summary: {
    previousBalance: string
    totalCharges: string
    totalPayments: string
    totalInterest: string
    currentBalance: string
  }
  aging: {
    title: string
    current: string
    days30: string
    days60: string
    days90Plus: string
  }
  lineItems: {
    title: string
    date: string
    description: string
    type: string
    amount: string
    balance: string
    types: Record<string, string>
  }
}

interface IAccountStatementClientProps {
  allUnits: IUnit[]
  selectedUnitId: string
  initialFrom: string
  initialTo: string
  translations: ITranslations
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CHIP_COLOR: Record<string, 'success' | 'danger' | 'warning' | 'secondary'> = {
  charge: 'danger',
  payment: 'success',
  interest: 'warning',
  adjustment: 'secondary',
}

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return { from, to }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AccountStatementClient({
  allUnits,
  selectedUnitId,
  initialFrom,
  initialTo,
  translations: t,
}: IAccountStatementClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const defaults = getDefaultDateRange()
  const [unitId, setUnitId] = useState(selectedUnitId)
  const [from, setFrom] = useState(initialFrom || defaults.from)
  const [to, setTo] = useState(initialTo || defaults.to)
  const [queryEnabled, setQueryEnabled] = useState(!!(initialFrom && initialTo))

  const { data, isLoading, error } = useAccountStatement(
    unitId,
    { from, to },
    { enabled: queryEnabled && !!from && !!to }
  )

  const statement: IAccountStatementData | undefined = data?.data

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })
      const query = params.toString()

      router.push(`${pathname}${query ? `?${query}` : ''}`)
    },
    [router, pathname, searchParams]
  )

  const handleSearch = () => {
    setQueryEnabled(true)
    updateParams({ unitId, from, to })
  }

  const unitItems: ISelectItem[] = allUnits.map(u => ({
    key: u.id,
    label: `${u.unitNumber} — ${u.buildingName} (${u.condominiumName})`,
  }))

  // ─── Line items table ────────────────────────────────────────────────────

  type TLineItemRow = IAccountStatementLineItem & { id: string }

  const lineItemRows: TLineItemRow[] = (statement?.lineItems ?? []).map((item, idx) => ({
    ...item,
    id: item.referenceId || `line-${idx}`,
  }))

  const columns: ITableColumn<TLineItemRow>[] = [
    { key: 'date', label: t.lineItems.date, width: 120 },
    { key: 'type', label: t.lineItems.type, width: 100 },
    { key: 'description', label: t.lineItems.description },
    { key: 'amount', label: t.lineItems.amount, align: 'end' as const, width: 140 },
    { key: 'runningBalance', label: t.lineItems.balance, align: 'end' as const, width: 140 },
  ]

  const renderCell = (row: TLineItemRow, key: string) => {
    switch (key) {
      case 'date':
        return formatShortDate(row.date)
      case 'type':
        return (
          <Chip color={TYPE_CHIP_COLOR[row.type] ?? 'default'} size="sm">
            {t.lineItems.types[row.type] ?? row.type}
          </Chip>
        )
      case 'description':
        return row.description
      case 'amount': {
        const isNegative = row.type === 'payment'

        return (
          <span className={isNegative ? 'text-success' : ''}>
            {isNegative ? '-' : ''}
            {formatAmount(row.amount)}
          </span>
        )
      }
      case 'runningBalance':
        return formatAmount(row.runningBalance)
      default:
        return null
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Typography variant="h2">{t.title}</Typography>
        <Typography className="mt-1" color="muted">
          {t.subtitle}
        </Typography>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        {allUnits.length > 1 && (
          <div className="w-64">
            <Select
              items={unitItems}
              label={t.selectUnit}
              selectedKeys={[unitId]}
              onSelectionChange={(keys: any) => {
                const selected = Array.isArray(keys) ? keys[0] : keys

                if (selected) setUnitId(String(selected))
              }}
            />
          </div>
        )}
        <div className="w-44">
          <DatePicker label={t.from} value={from} onChange={val => setFrom(val ?? '')} />
        </div>
        <div className="w-44">
          <DatePicker label={t.to} value={to} onChange={val => setTo(val ?? '')} />
        </div>
        <Button color="primary" isDisabled={!from || !to} onPress={handleSearch}>
          {t.search}
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <Typography className="ml-3" color="muted">
            {t.loading}
          </Typography>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4">
          <Typography color="danger">{t.error}</Typography>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && queryEnabled && statement && lineItemRows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">{t.empty}</Typography>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && statement && lineItemRows.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <SummaryCard label={t.summary.previousBalance} value={statement.previousBalance} />
            <SummaryCard
              label={t.summary.totalCharges}
              value={statement.totalCharges}
              variant="danger"
            />
            <SummaryCard
              label={t.summary.totalPayments}
              value={statement.totalPayments}
              variant="success"
            />
            <SummaryCard
              label={t.summary.totalInterest}
              value={statement.totalInterest}
              variant="warning"
            />
            <SummaryCard
              label={t.summary.currentBalance}
              value={statement.currentBalance}
              variant="primary"
            />
          </div>

          {/* Aging breakdown */}
          <div className="rounded-lg border border-divider bg-content1 p-4">
            <Typography className="mb-3" variant="subtitle1">
              {t.aging.title}
            </Typography>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <AgingCard label={t.aging.current} value={statement.aging.current} />
              <AgingCard label={t.aging.days30} value={statement.aging.days30} />
              <AgingCard label={t.aging.days60} value={statement.aging.days60} />
              <AgingCard label={t.aging.days90Plus} value={statement.aging.days90Plus} />
            </div>
          </div>

          {/* Line items table */}
          <div>
            <Typography className="mb-3" variant="subtitle1">
              {t.lineItems.title}
            </Typography>
            <Table
              fullWidth
              aria-label="account-statement"
              columns={columns}
              renderCell={renderCell}
              rows={lineItemRows}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string
  value: string
  variant?: 'danger' | 'success' | 'warning' | 'primary'
}) {
  const colorClass =
    variant === 'danger'
      ? 'text-danger'
      : variant === 'success'
        ? 'text-success'
        : variant === 'warning'
          ? 'text-warning'
          : variant === 'primary'
            ? 'text-primary'
            : 'text-foreground'

  return (
    <div className="rounded-lg border border-divider bg-content1 p-4">
      <Typography className="mb-1" color="muted" variant="caption">
        {label}
      </Typography>
      <Typography className={colorClass} variant="h4">
        {formatAmount(value)}
      </Typography>
    </div>
  )
}

function AgingCard({ label, value }: { label: string; value: string }) {
  const numValue = parseFloat(value) || 0

  return (
    <div className="text-center">
      <Typography color="muted" variant="caption">
        {label}
      </Typography>
      <Typography className={numValue > 0 ? 'font-semibold text-danger' : ''} variant="body1">
        {formatAmount(value)}
      </Typography>
    </div>
  )
}
