'use client'

import type { IDelinquencyUnit } from '@packages/http-client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { AlertTriangle, Download } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'
import {
  useDelinquencyReport,
  useCondominiumBuildingsList,
  useMyCompanyPaymentConceptsPaginated,
  useCondominiumUnits,
} from '@packages/http-client'

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
  filterByConcept: string
  allConcepts: string
  filterByUnit: string
  allUnits: string
  search: string
  exportPdf: string
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
  managementCompanyId?: string
  translations: ITranslations
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Export
// ─────────────────────────────────────────────────────────────────────────────

interface IPdfFilters {
  asOfDate: string
  buildingName?: string
  conceptName?: string
  unitNumber?: string
}

function exportDelinquencyPdf(
  report: { summary: any; delinquentUnits: IDelinquencyUnit[]; currencySymbol: string | null },
  filters: IPdfFilters,
  title: string,
  t: ITranslations
) {
  const cs = report.currencySymbol ?? '$'
  const fmt = (v: string) => `${cs} ${formatAmount(v)}`

  // Build filter summary
  const filterLines: string[] = [`<strong>${t.asOfDate}:</strong> ${filters.asOfDate}`]

  if (filters.buildingName)
    filterLines.push(`<strong>${t.filterByBuilding}:</strong> ${filters.buildingName}`)
  if (filters.conceptName)
    filterLines.push(`<strong>${t.filterByConcept}:</strong> ${filters.conceptName}`)
  if (filters.unitNumber)
    filterLines.push(`<strong>${t.filterByUnit}:</strong> ${filters.unitNumber}`)

  const rows = report.delinquentUnits
    .map(
      u =>
        `<tr>
          <td>${u.unitNumber}</td>
          <td>${u.buildingName}</td>
          <td class="r">${fmt(u.totalDebt)}</td>
          <td class="r">${u.overdueQuotaCount}</td>
          <td>${formatShortDate(u.oldestDueDate)}</td>
          <td class="r">${fmt(u.aging.current)}</td>
          <td class="r">${fmt(u.aging.days30)}</td>
          <td class="r">${fmt(u.aging.days60)}</td>
          <td class="r">${fmt(u.aging.days90Plus)}</td>
        </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:24px;color:#1a1a1a;font-size:11px}
  h1{font-size:18px;margin-bottom:4px}
  .filters{color:#444;margin-bottom:16px;padding:10px 12px;background:#fafafa;border:1px solid #e5e5e5;border-radius:6px;font-size:11px;line-height:1.8}
  .filters span{display:inline-block;margin-right:20px}
  .summary{display:flex;gap:24px;margin-bottom:16px;padding:12px;background:#f5f5f5;border-radius:6px}
  .summary div{flex:1}
  .summary .label{color:#666;font-size:10px;text-transform:uppercase}
  .summary .value{font-size:16px;font-weight:600;margin-top:2px}
  .danger{color:#dc2626}
  .success{color:#16a34a}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{background:#f5f5f5;padding:6px 8px;text-align:left;border-bottom:2px solid #e5e5e5;font-weight:600}
  td{padding:6px 8px;border-bottom:1px solid #eee}
  .r{text-align:right}
  .generated{margin-top:16px;color:#999;font-size:9px;text-align:right}
  @media print{body{margin:12px}@page{size:landscape;margin:10mm}}
</style>
</head><body>
<h1>${title}</h1>
<div class="filters">${filterLines.map(l => `<span>${l}</span>`).join('')}</div>
<div class="summary">
  <div><div class="label">${t.summary.totalDelinquent}</div><div class="value danger">${fmt(report.summary.totalDelinquent)}</div></div>
  <div><div class="label">${t.summary.delinquentUnits}</div><div class="value">${report.summary.delinquentUnitCount}</div></div>
  <div><div class="label">${t.summary.totalUnits}</div><div class="value">${report.summary.totalUnits}</div></div>
  <div><div class="label">${t.summary.collectionRate}</div><div class="value success">${report.summary.collectionRate}%</div></div>
</div>
<table>
  <thead><tr>
    <th>${t.table.unit}</th><th>${t.table.building}</th><th class="r">${t.table.totalDebt}</th>
    <th class="r">${t.table.overdueQuotas}</th><th>${t.table.oldestDueDate}</th>
    <th class="r">${t.table.current}</th><th class="r">${t.table.days30}</th>
    <th class="r">${t.table.days60}</th><th class="r">${t.table.days90Plus}</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="generated">Generado: ${new Date().toLocaleString('es-VE')}</div>
</body></html>`

  const w = window.open('', '_blank')

  if (!w) return
  w.document.write(html)
  w.document.close()
  w.onload = () => w.print()
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DelinquencyReportClient({
  condominiumId,
  initialAsOfDate,
  initialBuildingId,
  managementCompanyId,
  translations: t,
}: IDelinquencyReportClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const today = new Date().toISOString().split('T')[0]!

  // Draft filter state (what the user is editing)
  const [asOfDate, setAsOfDate] = useState(initialAsOfDate || today)
  const [buildingId, setBuildingId] = useState(initialBuildingId)
  const [conceptId, setConceptId] = useState('')
  const [unitId, setUnitId] = useState('')

  // Committed filter state (what the query actually uses)
  const [committed, setCommitted] = useState<{
    asOfDate: string
    buildingId: string
    conceptId: string
    unitId: string
  } | null>(
    initialAsOfDate
      ? { asOfDate: initialAsOfDate, buildingId: initialBuildingId, conceptId: '', unitId: '' }
      : null
  )

  const { data, isLoading, error } = useDelinquencyReport(
    {
      asOfDate: committed?.asOfDate ?? '',
      buildingId: committed?.buildingId || undefined,
      conceptId: committed?.conceptId || undefined,
      unitId: committed?.unitId || undefined,
      condominiumId,
    },
    { enabled: !!committed?.asOfDate }
  )

  const { data: buildingsData } = useCondominiumBuildingsList({ condominiumId })
  const buildings = buildingsData?.data ?? []

  const { data: conceptsData } = useMyCompanyPaymentConceptsPaginated({
    companyId: managementCompanyId ?? '',
    query: { condominiumId, limit: 100 },
    enabled: !!managementCompanyId,
  })
  const concepts = conceptsData?.data ?? []

  const { data: unitsData } = useCondominiumUnits({
    condominiumId,
    managementCompanyId,
  })
  const units = unitsData?.data ?? []

  const report = data?.data
  const currencySymbol = report?.currencySymbol ?? '$'

  const fmtCurrency = (val: string) => `${currencySymbol} ${formatAmount(val)}`

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
    setCommitted({ asOfDate, buildingId, conceptId, unitId })
    updateParams({ asOfDate, buildingId, conceptId, unitId })
  }

  // Resolve names for PDF filters
  const getFilterNames = useCallback(() => {
    const filters: IPdfFilters = { asOfDate: committed?.asOfDate ?? '' }

    if (committed?.buildingId) {
      const b = buildings.find((b: any) => b.id === committed.buildingId)

      if (b) filters.buildingName = b.name
    }
    if (committed?.conceptId) {
      const c = concepts.find((c: any) => c.id === committed.conceptId)

      if (c) filters.conceptName = c.name
    }
    if (committed?.unitId) {
      const u = units.find((u: any) => u.id === committed.unitId)

      if (u) filters.unitNumber = u.unitNumber
    }

    return filters
  }, [committed, buildings, concepts, units])

  const handleExportPdf = () => {
    if (!report) return
    exportDelinquencyPdf(report, getFilterNames(), t.title, t)
  }

  const buildingItems: ISelectItem[] = [
    { key: '', label: t.allBuildings },
    ...buildings.map((b: { id: string; name: string }) => ({
      key: b.id,
      label: b.name,
    })),
  ]

  const conceptItems: ISelectItem[] = [
    { key: '', label: t.allConcepts },
    ...concepts.map((c: { id: string; name: string }) => ({
      key: c.id,
      label: c.name,
    })),
  ]

  const unitItems: ISelectItem[] = [
    { key: '', label: t.allUnits },
    ...units.map((u: { id: string; unitNumber: string }) => ({
      key: u.id,
      label: u.unitNumber,
    })),
  ]

  // ─── Table ─────────────────────────────────────────────────────────────

  type TDelinquencyRow = IDelinquencyUnit & { id: string }

  const delinquencyRows: TDelinquencyRow[] = (report?.delinquentUnits ?? []).map(u => ({
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
        return <span className="font-semibold text-danger">{fmtCurrency(row.totalDebt)}</span>
      case 'overdueQuotaCount':
        return row.overdueQuotaCount
      case 'oldestDueDate':
        return formatShortDate(row.oldestDueDate)
      case 'current':
        return fmtCurrency(row.aging.current)
      case 'days30':
        return fmtCurrency(row.aging.days30)
      case 'days60':
        return fmtCurrency(row.aging.days60)
      case 'days90Plus': {
        const val = parseFloat(row.aging.days90Plus) || 0

        return (
          <span className={val > 0 ? 'font-semibold text-danger' : ''}>
            {fmtCurrency(row.aging.days90Plus)}
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-row lg:flex-wrap lg:items-end">
        <DatePicker
          label={t.asOfDate}
          value={asOfDate}
          onChange={val => setAsOfDate(val ?? today)}
        />
        {buildings.length > 0 && (
          <Select
            items={buildingItems}
            label={t.filterByBuilding}
            selectedKeys={[buildingId]}
            onSelectionChange={(keys: any) => {
              const selected = Array.from(keys as Set<string>)[0]

              setBuildingId(selected ? String(selected) : '')
            }}
          />
        )}
        {concepts.length > 0 && (
          <Select
            items={conceptItems}
            label={t.filterByConcept}
            selectedKeys={[conceptId]}
            onSelectionChange={(keys: any) => {
              const selected = Array.from(keys as Set<string>)[0]

              setConceptId(selected ? String(selected) : '')
            }}
          />
        )}
        {units.length > 0 && (
          <Select
            items={unitItems}
            label={t.filterByUnit}
            selectedKeys={[unitId]}
            onSelectionChange={(keys: any) => {
              const selected = Array.from(keys as Set<string>)[0]

              setUnitId(selected ? String(selected) : '')
            }}
          />
        )}
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <Button
            className="flex-1 lg:flex-initial"
            color="primary"
            isDisabled={!asOfDate}
            onPress={handleSearch}
          >
            {t.search}
          </Button>
          {report && report.delinquentUnits.length > 0 && (
            <Button
              className="flex-1 lg:flex-initial"
              startContent={<Download className="h-4 w-4" />}
              variant="bordered"
              onPress={handleExportPdf}
            >
              {t.exportPdf}
            </Button>
          )}
        </div>
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
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 dark:border-danger-800 dark:bg-danger-900/20">
          <Typography color="danger">{t.error}</Typography>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && committed && report && report.delinquentUnits.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <AlertTriangle className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">{t.empty}</Typography>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && report && report.delinquentUnits.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="rounded-lg border border-divider bg-content1 p-5">
            <Typography className="mb-4" variant="subtitle1">
              {t.summary.title}
            </Typography>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div>
                <Typography color="muted" variant="caption">
                  {t.summary.totalDelinquent}
                </Typography>
                <Typography className="text-danger" variant="h4">
                  {fmtCurrency(report.summary.totalDelinquent)}
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
                <Typography className="text-success" variant="h4">
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
