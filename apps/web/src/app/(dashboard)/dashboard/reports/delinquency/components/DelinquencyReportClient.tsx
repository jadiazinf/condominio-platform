'use client'

import type { IDelinquencyUnit } from '@packages/http-client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'
import { useDelinquencyReport, useCondominiumBuildingsList } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Select, type ISelectItem } from '@/ui/components/select'
import { DatePicker } from '@/ui/components/date-picker'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Spinner } from '@/ui/components/spinner'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ITranslations {
  title: string
  subtitle: string
  asOfDate: string
  filterByBuilding: string
  allBuildings: string
  search: string
  loading: string
  error: string
  empty: string
  summary: {
    title: string
    totalDelinquent: string
    delinquentUnits: string
    totalUnits: string
    collectionRate: string
  }
  table: {
    unit: string
    building: string
    totalDebt: string
    overdueQuotas: string
    oldestDueDate: string
    current: string
    days30: string
    days60: string
    days90Plus: string
  }
}

interface IDelinquencyReportClientProps {
  condominiumId: string
  initialAsOfDate: string
  initialBuildingId: string
  translations: ITranslations
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DelinquencyReportClient({
  condominiumId,
  initialAsOfDate,
  initialBuildingId,
  translations: t,
}: IDelinquencyReportClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const today = new Date().toISOString().split('T')[0]!
  const [asOfDate, setAsOfDate] = useState(initialAsOfDate || today)
  const [buildingId, setBuildingId] = useState(initialBuildingId)
  const [queryEnabled, setQueryEnabled] = useState(!!initialAsOfDate)

  const { data, isLoading, error } = useDelinquencyReport(
    { asOfDate, buildingId: buildingId || undefined },
    { enabled: queryEnabled && !!asOfDate }
  )

  const { data: buildingsData } = useCondominiumBuildingsList({ condominiumId })
  const buildings = buildingsData?.data ?? []

  const report = data?.data

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
    updateParams({ asOfDate, buildingId })
  }

  const buildingItems: ISelectItem[] = [
    { key: '', label: t.allBuildings },
    ...buildings.map((b: { id: string; name: string }) => ({
      key: b.id,
      label: b.name,
    })),
  ]

  // ─── Table ─────────────────────────────────────────────────────────────

  type TDelinquencyRow = IDelinquencyUnit & { id: string }

  const delinquencyRows: TDelinquencyRow[] = (report?.units ?? []).map(u => ({
    ...u,
    id: u.unitId,
  }))

  const columns: ITableColumn<TDelinquencyRow>[] = [
    { key: 'unitNumber', label: t.table.unit, width: 100 },
    { key: 'buildingName', label: t.table.building, width: 150 },
    { key: 'totalDebt', label: t.table.totalDebt, align: 'end' as const, width: 130 },
    { key: 'overdueQuotaCount', label: t.table.overdueQuotas, align: 'end' as const, width: 100 },
    { key: 'oldestDueDate', label: t.table.oldestDueDate, width: 120 },
    { key: 'current', label: t.table.current, align: 'end' as const, width: 110 },
    { key: 'days30', label: t.table.days30, align: 'end' as const, width: 110 },
    { key: 'days60', label: t.table.days60, align: 'end' as const, width: 110 },
    { key: 'days90Plus', label: t.table.days90Plus, align: 'end' as const, width: 110 },
  ]

  const renderCell = (row: TDelinquencyRow, key: string) => {
    switch (key) {
      case 'unitNumber':
        return <span className="font-medium">{row.unitNumber}</span>
      case 'buildingName':
        return row.buildingName
      case 'totalDebt':
        return <span className="font-semibold text-red-600">{formatAmount(row.totalDebt)}</span>
      case 'overdueQuotaCount':
        return row.overdueQuotaCount
      case 'oldestDueDate':
        return formatShortDate(row.oldestDueDate)
      case 'current':
        return formatAmount(row.aging.current)
      case 'days30':
        return formatAmount(row.aging.days30)
      case 'days60':
        return formatAmount(row.aging.days60)
      case 'days90Plus': {
        const val = parseFloat(row.aging.days90Plus) || 0

        return (
          <span className={val > 0 ? 'font-semibold text-red-600' : ''}>
            {formatAmount(row.aging.days90Plus)}
          </span>
        )
      }
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
        <div className="w-44">
          <DatePicker
            label={t.asOfDate}
            value={asOfDate}
            onChange={val => setAsOfDate(val ?? today)}
          />
        </div>
        {buildings.length > 0 && (
          <div className="w-56">
            <Select
              items={buildingItems}
              label={t.filterByBuilding}
              selectedKeys={[buildingId]}
              onSelectionChange={(keys: any) => {
                const selected = Array.isArray(keys) ? keys[0] : keys

                setBuildingId(selected ? String(selected) : '')
              }}
            />
          </div>
        )}
        <Button color="primary" isDisabled={!asOfDate} onPress={handleSearch}>
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <Typography color="danger">{t.error}</Typography>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && queryEnabled && report && report.units.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="mb-3 h-12 w-12 text-gray-300" />
          <Typography color="muted">{t.empty}</Typography>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && report && report.units.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="rounded-lg border bg-white p-5">
            <Typography className="mb-4" variant="subtitle1">
              {t.summary.title}
            </Typography>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div>
                <Typography color="muted" variant="caption">
                  {t.summary.totalDelinquent}
                </Typography>
                <Typography className="text-red-600" variant="h4">
                  {formatAmount(report.summary.totalDelinquent)}
                </Typography>
              </div>
              <div>
                <Typography color="muted" variant="caption">
                  {t.summary.delinquentUnits}
                </Typography>
                <Typography variant="h4">{report.summary.delinquentUnitCount}</Typography>
              </div>
              <div>
                <Typography color="muted" variant="caption">
                  {t.summary.totalUnits}
                </Typography>
                <Typography variant="h4">{report.summary.totalUnits}</Typography>
              </div>
              <div>
                <Typography color="muted" variant="caption">
                  {t.summary.collectionRate}
                </Typography>
                <Typography className="text-green-600" variant="h4">
                  {report.summary.collectionRate}%
                </Typography>
              </div>
            </div>
          </div>

          {/* Delinquent units table */}
          <Table
            fullWidth
            aria-label="delinquency-report"
            columns={columns}
            renderCell={renderCell}
            rows={delinquencyRows}
          />
        </>
      )}
    </div>
  )
}
