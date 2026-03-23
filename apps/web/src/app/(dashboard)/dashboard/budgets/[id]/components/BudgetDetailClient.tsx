'use client'

import type { TBudgetItem } from '@packages/domain'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import {
  useBudgetDetail,
  useBudgetVsActual,
  useBudgetCalculateQuotas,
  type IBudgetVsActualItem,
  type IUnitQuota,
  type ISkippedUnit,
} from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Table } from '@/ui/components/table'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ITranslations {
  back: string
  loading: string
  error: string
  tabs: { overview: string; vsActual: string; quotas: string }
  overview: {
    type: string
    period: string
    status: string
    totalAmount: string
    reserveFund: string
    items: string
    description: string
    amount: string
  }
  vsActual: {
    title: string
    description: string
    budgeted: string
    actual: string
    variance: string
    total: string
    loading: string
  }
  quotas: {
    title: string
    calculate: string
    unit: string
    aliquot: string
    amount: string
    budgetTotal: string
    reserveFund: string
    totalWithReserve: string
    skippedUnits: string
    loading: string
    notActive: string
  }
  statuses: Record<string, string>
  types: Record<string, string>
}

interface IBudgetDetailClientProps {
  budgetId: string
  translations: ITranslations
}

type TTab = 'overview' | 'vsActual' | 'quotas'

const STATUS_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  draft: 'default',
  approved: 'primary',
  active: 'success',
  closed: 'warning',
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function BudgetDetailClient({ budgetId, translations: t }: IBudgetDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TTab>('overview')

  const { data, isLoading, error } = useBudgetDetail(budgetId)
  const budget = data?.data

  const { data: vsActualData, isLoading: vsActualLoading } = useBudgetVsActual(budgetId, {
    enabled: activeTab === 'vsActual' && !!budget,
  })
  const vsActual = vsActualData?.data

  const { data: quotasData, isLoading: quotasLoading } = useBudgetCalculateQuotas(budgetId, {
    enabled: activeTab === 'quotas' && !!budget && budget.status !== 'draft',
  })
  const quotasResult = quotasData?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <Typography className="ml-3" color="muted">
          {t.loading}
        </Typography>
      </div>
    )
  }

  if (error || !budget) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <Typography color="danger">{t.error}</Typography>
      </div>
    )
  }

  const period =
    budget.budgetType === 'annual' || budget.periodMonth === null
      ? `${budget.periodYear}`
      : `${String(budget.periodMonth).padStart(2, '0')}/${budget.periodYear}`

  const tabs: { key: TTab; label: string }[] = [
    { key: 'overview', label: t.tabs.overview },
    { key: 'vsActual', label: t.tabs.vsActual },
    { key: 'quotas', label: t.tabs.quotas },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button isIconOnly variant="light" onPress={() => router.push('/dashboard/budgets')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <Typography variant="h2">{budget.name}</Typography>
          <div className="mt-1 flex items-center gap-3">
            <Chip color={STATUS_CHIP_COLOR[budget.status] ?? 'default'} size="sm">
              {t.statuses[budget.status] ?? budget.status}
            </Chip>
            <Typography color="muted">
              {t.types[budget.budgetType] ?? budget.budgetType} — {period}
            </Typography>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-white p-4">
              <Typography color="muted" variant="caption">
                {t.overview.totalAmount}
              </Typography>
              <Typography variant="h4">{formatAmount(budget.totalAmount)}</Typography>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <Typography color="muted" variant="caption">
                {t.overview.reserveFund}
              </Typography>
              <Typography variant="h4">{budget.reserveFundPercentage ?? '0'}%</Typography>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <Typography color="muted" variant="caption">
                {t.overview.type}
              </Typography>
              <Typography variant="h4">
                {t.types[budget.budgetType] ?? budget.budgetType}
              </Typography>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <Typography color="muted" variant="caption">
                {t.overview.period}
              </Typography>
              <Typography variant="h4">{period}</Typography>
            </div>
          </div>

          {/* Items */}
          {budget.items && budget.items.length > 0 && (
            <div>
              <Typography className="mb-3" variant="subtitle1">
                {t.overview.items}
              </Typography>
              <Table
                fullWidth
                aria-label="budget-items"
                columns={[
                  { key: 'description', label: t.overview.description },
                  {
                    key: 'budgetedAmount',
                    label: t.overview.amount,
                    align: 'end' as const,
                    width: 150,
                  },
                ]}
                renderCell={(
                  row: TBudgetItem & { id: string },
                  key: keyof (TBudgetItem & { id: string }) | string
                ) => {
                  if (key === 'budgetedAmount')
                    return <span className="font-semibold">{formatAmount(row.budgetedAmount)}</span>
                  if (key === 'description') return row.description

                  return null
                }}
                rows={budget.items.map((item: TBudgetItem) => ({ ...item, id: item.id }))}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'vsActual' && (
        <div className="space-y-4">
          <Typography variant="subtitle1">{t.vsActual.title}</Typography>
          {vsActualLoading && (
            <div className="flex items-center justify-center py-8">
              <Spinner />
              <Typography className="ml-3" color="muted">
                {t.vsActual.loading}
              </Typography>
            </div>
          )}
          {!vsActualLoading && vsActual && (
            <>
              <Table
                fullWidth
                aria-label="budget-vs-actual"
                columns={[
                  { key: 'description', label: t.vsActual.description },
                  {
                    key: 'budgetedAmount',
                    label: t.vsActual.budgeted,
                    align: 'end' as const,
                    width: 140,
                  },
                  {
                    key: 'actualAmount',
                    label: t.vsActual.actual,
                    align: 'end' as const,
                    width: 140,
                  },
                  {
                    key: 'variance',
                    label: t.vsActual.variance,
                    align: 'end' as const,
                    width: 140,
                  },
                ]}
                renderCell={(
                  row: IBudgetVsActualItem & { id: string },
                  key: keyof (IBudgetVsActualItem & { id: string }) | string
                ) => {
                  if (key === 'description') return row.description
                  if (key === 'budgetedAmount') return formatAmount(row.budgetedAmount)
                  if (key === 'actualAmount') return formatAmount(row.actualAmount)
                  if (key === 'variance') {
                    const val = parseFloat(row.variance)

                    return (
                      <span
                        className={
                          val < 0 ? 'font-semibold text-red-600' : val > 0 ? 'text-green-600' : ''
                        }
                      >
                        {formatAmount(row.variance)}
                      </span>
                    )
                  }

                  return null
                }}
                rows={vsActual.items.map((item: IBudgetVsActualItem, idx: number) => ({
                  ...item,
                  id: item.budgetItemId || `vs-${idx}`,
                }))}
              />
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-white p-4 text-center">
                  <Typography color="muted" variant="caption">
                    {t.vsActual.budgeted}
                  </Typography>
                  <Typography variant="h4">{formatAmount(vsActual.totalBudgeted)}</Typography>
                </div>
                <div className="rounded-lg border bg-white p-4 text-center">
                  <Typography color="muted" variant="caption">
                    {t.vsActual.actual}
                  </Typography>
                  <Typography variant="h4">{formatAmount(vsActual.totalActual)}</Typography>
                </div>
                <div className="rounded-lg border bg-white p-4 text-center">
                  <Typography color="muted" variant="caption">
                    {t.vsActual.variance}
                  </Typography>
                  <Typography
                    className={
                      parseFloat(vsActual.totalVariance) < 0 ? 'text-red-600' : 'text-green-600'
                    }
                    variant="h4"
                  >
                    {formatAmount(vsActual.totalVariance)}
                  </Typography>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'quotas' && (
        <div className="space-y-4">
          <Typography variant="subtitle1">{t.quotas.title}</Typography>
          {budget.status === 'draft' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <Typography color="warning">{t.quotas.notActive}</Typography>
            </div>
          )}
          {budget.status !== 'draft' && quotasLoading && (
            <div className="flex items-center justify-center py-8">
              <Spinner />
              <Typography className="ml-3" color="muted">
                {t.quotas.loading}
              </Typography>
            </div>
          )}
          {budget.status !== 'draft' && !quotasLoading && quotasResult && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-white p-4 text-center">
                  <Typography color="muted" variant="caption">
                    {t.quotas.budgetTotal}
                  </Typography>
                  <Typography variant="h4">{formatAmount(quotasResult.budgetTotal)}</Typography>
                </div>
                <div className="rounded-lg border bg-white p-4 text-center">
                  <Typography color="muted" variant="caption">
                    {t.quotas.reserveFund}
                  </Typography>
                  <Typography variant="h4">{quotasResult.reserveFundPercentage}%</Typography>
                </div>
                <div className="rounded-lg border bg-white p-4 text-center">
                  <Typography color="muted" variant="caption">
                    {t.quotas.totalWithReserve}
                  </Typography>
                  <Typography className="text-blue-600" variant="h4">
                    {formatAmount(quotasResult.totalWithReserve)}
                  </Typography>
                </div>
              </div>

              <Table
                fullWidth
                aria-label="calculated-quotas"
                columns={[
                  { key: 'unitNumber', label: t.quotas.unit, width: 120 },
                  {
                    key: 'aliquotPercentage',
                    label: t.quotas.aliquot,
                    align: 'end' as const,
                    width: 120,
                  },
                  { key: 'amount', label: t.quotas.amount, align: 'end' as const, width: 150 },
                ]}
                renderCell={(
                  row: IUnitQuota & { id: string },
                  key: keyof (IUnitQuota & { id: string }) | string
                ) => {
                  if (key === 'unitNumber')
                    return <span className="font-medium">{row.unitNumber}</span>
                  if (key === 'aliquotPercentage') return `${row.aliquotPercentage}%`
                  if (key === 'amount')
                    return <span className="font-semibold">{formatAmount(row.amount)}</span>

                  return null
                }}
                rows={quotasResult.quotas.map((q: IUnitQuota) => ({ ...q, id: q.unitId }))}
              />

              {quotasResult.skippedUnits.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <Typography className="mb-2" variant="subtitle2">
                    {t.quotas.skippedUnits}
                  </Typography>
                  <ul className="list-inside list-disc">
                    {quotasResult.skippedUnits.map((u: ISkippedUnit) => (
                      <li key={u.unitId}>
                        <Typography as="span" color="muted">
                          {u.unitNumber}: {u.reason}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
