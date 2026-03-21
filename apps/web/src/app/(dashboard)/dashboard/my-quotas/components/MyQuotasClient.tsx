'use client'

import type { TQuota, TQuotaStatus, TPaginationMeta } from '@packages/domain'
import type { TReportFormat, IQuotasByUnitQuery } from '@packages/http-client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Receipt, Download, X } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { downloadAccountStatement } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Pagination } from '@/ui/components/pagination'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Checkbox } from '@/ui/components/checkbox'
import { DatePicker } from '@/ui/components/date-picker'
import { useToast } from '@/ui/components/toast'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IUnitInfo {
  id: string
  unitNumber: string
  buildingName: string
  condominiumId: string
  condominiumName: string
}

interface IConceptInfo {
  id: string
  name: string
}

interface IMyQuotasClientProps {
  quotas: TQuota[]
  pagination: TPaginationMeta
  initialQuery: IQuotasByUnitQuery
  selectedUnitId: string
  allUnits: IUnitInfo[]
  concepts: IConceptInfo[]
  translations: {
    title: string
    subtitle: string
    empty: string
    concept: string
    period: string
    amount: string
    dueDate: string
    balance: string
    unit: string
    issueDate: string
    totalPending: string
    overdueCount: string
    paidThisMonth: string
    filter: Record<string, string>
    status: Record<string, string>
    export: {
      csv: string
      pdf: string
      success: string
      error: string
    }
  }
}

type TStatusFilter = 'all' | TQuotaStatus

type TQuotaRow = TQuota & { id: string }

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_FILTERS: TStatusFilter[] = [
  'all',
  'pending',
  'partial',
  'overdue',
  'paid',
  'cancelled',
  'exonerated',
]

const STATUS_CHIP_COLOR: Record<
  TQuotaStatus,
  'warning' | 'danger' | 'success' | 'default' | 'secondary' | 'primary'
> = {
  pending: 'warning',
  partial: 'primary',
  overdue: 'danger',
  paid: 'success',
  cancelled: 'default',
  exonerated: 'secondary',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ENGLISH_TO_SPANISH_MONTHS: Record<string, string> = {
  January: 'Enero',
  February: 'Febrero',
  March: 'Marzo',
  April: 'Abril',
  May: 'Mayo',
  June: 'Junio',
  July: 'Julio',
  August: 'Agosto',
  September: 'Septiembre',
  October: 'Octubre',
  November: 'Noviembre',
  December: 'Diciembre',
}

function translatePeriodDescription(description: string): string {
  if (!description) return ''

  return description.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,
    match => ENGLISH_TO_SPANISH_MONTHS[match] ?? match
  )
}

function formatDateES(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')

  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatAmountES(amount: string, currencySymbol: string): string {
  return `${currencySymbol} ${formatAmount(amount)}`
}

function formatPeriod(year: number, month: number | null, description: string | null): string {
  if (description) return translatePeriodDescription(description)
  if (month !== null) {
    const date = new Date(year, month - 1)

    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
  }

  return String(year)
}

/** Quotas that can be selected for payment */
function isPayable(status: string): boolean {
  return status === 'pending' || status === 'partial' || status === 'overdue'
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MyQuotasClient({
  quotas,
  pagination,
  initialQuery,
  selectedUnitId,
  allUnits,
  concepts,
  translations: t,
}: IMyQuotasClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [exporting, setExporting] = useState<TReportFormat | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const currentStatus = (initialQuery.status as TStatusFilter) || 'all'
  const currentConceptId = initialQuery.conceptId || 'all'
  const basePath = '/dashboard/my-quotas'

  // ─────────────────────────────────────────────────────────────────────────
  // Data
  // ─────────────────────────────────────────────────────────────────────────

  const rows: TQuotaRow[] = quotas as TQuotaRow[]

  const payableRows = useMemo(() => rows.filter(r => isPayable(r.status)), [rows])

  const selectedCount = selectedIds.size

  // ─────────────────────────────────────────────────────────────────────────
  // URL update (triggers SSR re-fetch)
  // ─────────────────────────────────────────────────────────────────────────

  const updateUrl = useCallback(
    (updates: Partial<IQuotasByUnitQuery & { unitId?: string }>) => {
      const params = new URLSearchParams(searchParams.toString())

      if (updates.page !== undefined) {
        if (updates.page === 1) params.delete('page')
        else params.set('page', String(updates.page))
      }

      if (updates.limit !== undefined) {
        if (updates.limit === 10) params.delete('limit')
        else params.set('limit', String(updates.limit))
      }

      if ('status' in updates) {
        if (!updates.status) params.delete('status')
        else params.set('status', updates.status)
      }

      if ('unitId' in updates) {
        if (!updates.unitId || updates.unitId === allUnits[0]?.id) params.delete('unitId')
        else params.set('unitId', updates.unitId)
      }

      if ('startDate' in updates) {
        if (!updates.startDate) params.delete('startDate')
        else params.set('startDate', updates.startDate)
      }

      if ('endDate' in updates) {
        if (!updates.endDate) params.delete('endDate')
        else params.set('endDate', updates.endDate)
      }

      if ('conceptId' in updates) {
        if (!updates.conceptId) params.delete('conceptId')
        else params.set('conceptId', updates.conceptId)
      }

      const queryString = params.toString()

      router.push(`${basePath}${queryString ? `?${queryString}` : ''}`)
    },
    [router, searchParams, allUnits]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleExport = async (format: TReportFormat) => {
    setExporting(format)
    try {
      await downloadAccountStatement({ unitId: selectedUnitId, format })
      toast.success(t.export.success)
    } catch {
      toast.error(t.export.error)
    } finally {
      setExporting(null)
    }
  }

  const handleStatusFilter = (filter: TStatusFilter) => {
    setSelectedIds(new Set())
    updateUrl({ status: filter === 'all' ? undefined : filter, page: 1 })
  }

  const handleUnitChange = (key: string | null) => {
    if (key) {
      setSelectedIds(new Set())
      updateUrl({ unitId: key, page: 1 })
    }
  }

  const handleRowClick = (row: TQuotaRow) => {
    router.push(`/dashboard/my-quotas/${row.id}`)
  }

  // Checkbox toggle for a single row
  const toggleRow = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setSelectedIds(prev => {
        const row = rows.find(r => r.id === id)

        if (!row || !isPayable(row.status)) return prev

        const next = new Set(prev)

        if (next.has(id)) next.delete(id)
        else next.add(id)

        return next
      })
    },
    [rows]
  )

  // Select all payable on current page
  const toggleSelectAll = () => {
    if (payableRows.length > 0 && payableRows.every(r => selectedIds.has(r.id))) {
      // Deselect current page
      const next = new Set(selectedIds)

      payableRows.forEach(r => next.delete(r.id))
      setSelectedIds(next)
    } else {
      // Select current page payable
      const next = new Set(selectedIds)

      payableRows.forEach(r => next.add(r.id))
      setSelectedIds(next)
    }
  }

  const allPageSelected = payableRows.length > 0 && payableRows.every(r => selectedIds.has(r.id))
  const somePageSelected = payableRows.some(r => selectedIds.has(r.id))

  // ─────────────────────────────────────────────────────────────────────────
  // Table columns
  // ─────────────────────────────────────────────────────────────────────────

  const columns: ITableColumn<TQuotaRow>[] = [
    { key: 'select', label: '', width: 40 },
    { key: 'concept', label: t.concept },
    { key: 'period', label: t.period },
    { key: 'dueDate', label: t.dueDate, hideOnMobile: true },
    { key: 'amount', label: t.amount, align: 'end' },
    { key: 'status', label: 'Status', align: 'center' },
  ]

  // NOTE: intentionally NOT memoized — HeroUI Table caches cells internally
  // so the function must always have a fresh closure over `selectedIds`.
  const renderCell = (row: TQuotaRow, columnKey: keyof TQuotaRow | string) => {
    const currencySymbol = row.currency?.symbol ?? '$'

    switch (columnKey) {
      case 'select':
        return (
          <div onClick={e => e.stopPropagation()}>
            <Checkbox
              color="primary"
              isDisabled={!isPayable(row.status)}
              isSelected={isPayable(row.status) && selectedIds.has(row.id)}
              onValueChange={() => toggleRow(row.id)}
            />
          </div>
        )

      case 'concept':
        return (
          <span className="font-medium">
            {row.paymentConcept?.name ?? row.periodDescription ?? '-'}
          </span>
        )

      case 'period':
        return formatPeriod(row.periodYear, row.periodMonth, row.periodDescription)

      case 'dueDate':
        return formatDateES(row.dueDate)

      case 'amount':
        return formatAmountES(row.baseAmount, currencySymbol)

      case 'status':
        return (
          <Chip color={STATUS_CHIP_COLOR[row.status as TQuotaStatus] ?? 'default'} variant="flat">
            {t.status[row.status] ?? row.status}
          </Chip>
        )

      default:
        return null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Unit selector items
  // ─────────────────────────────────────────────────────────────────────────

  const unitItems: ISelectItem[] = allUnits.map(u => ({
    key: u.id,
    label: u.buildingName ? `${u.unitNumber} - ${u.buildingName}` : u.unitNumber,
  }))

  const statusItems: ISelectItem[] = STATUS_FILTERS.map(filter => ({
    key: filter,
    label: t.filter[filter] ?? filter,
  }))

  const conceptItems: ISelectItem[] = [
    { key: 'all', label: t.filter.all ?? 'Todas' },
    ...concepts.map(c => ({ key: c.id, label: c.name })),
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // Date filter state
  // ─────────────────────────────────────────────────────────────────────────

  const currentStartDate = initialQuery.startDate ?? ''
  const currentEndDate = initialQuery.endDate ?? ''

  const hasActiveFilters =
    currentStatus !== 'all' || currentConceptId !== 'all' || !!currentStartDate || !!currentEndDate

  const clearFilters = useCallback(() => {
    setSelectedIds(new Set())
    router.push(basePath)
  }, [router, basePath])

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Typography variant="h2">{t.title}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t.subtitle}
          </Typography>
        </div>
        <div className="flex gap-2">
          <Button
            isDisabled={exporting !== null}
            isLoading={exporting === 'csv'}
            startContent={<Download size={16} />}
            variant="bordered"
            onPress={() => handleExport('csv')}
          >
            {t.export.csv}
          </Button>
          <Button
            isDisabled={exporting !== null}
            isLoading={exporting === 'pdf'}
            startContent={<Download size={16} />}
            variant="bordered"
            onPress={() => handleExport('pdf')}
          >
            {t.export.pdf}
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        {allUnits.length > 1 && (
          <Select
            aria-label={t.unit}
            className="w-full sm:w-52"
            items={unitItems}
            value={selectedUnitId}
            variant="bordered"
            onChange={handleUnitChange}
          />
        )}

        {/* Date filters */}
        <DatePicker
          className="w-full sm:w-44"
          label={t.issueDate}
          value={currentStartDate}
          variant="bordered"
          onChange={value => updateUrl({ startDate: value || undefined, page: 1 })}
        />
        <DatePicker
          className="w-full sm:w-44"
          label="Hasta"
          value={currentEndDate}
          variant="bordered"
          onChange={value => updateUrl({ endDate: value || undefined, page: 1 })}
        />

        {/* Concept filter */}
        {concepts.length > 0 && (
          <Select
            aria-label={t.concept}
            className="w-full sm:w-52"
            items={conceptItems}
            label={t.concept}
            value={currentConceptId}
            variant="bordered"
            onChange={key => {
              setSelectedIds(new Set())
              updateUrl({ conceptId: key === 'all' ? undefined : (key ?? undefined), page: 1 })
            }}
          />
        )}

        {/* Status filter */}
        <Select
          aria-label="Estado"
          className="w-full sm:w-44"
          items={statusItems}
          value={currentStatus}
          variant="bordered"
          onChange={key => handleStatusFilter((key ?? 'all') as TStatusFilter)}
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            className="shrink-0"
            startContent={<X size={14} />}
            variant="flat"
            onPress={clearFilters}
          >
            {t.filter.clear ?? 'Limpiar filtros'}
          </Button>
        )}
      </div>

      {/* Selection bar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-primary-50 dark:bg-primary-900/20 px-4 py-3">
          <Typography variant="body2">
            {selectedCount} {selectedCount === 1 ? 'seleccionada' : 'seleccionadas'}
          </Typography>
          <Button
            color="primary"
            onPress={() => {
              const ids = Array.from(selectedIds).join(',')

              router.push(`/dashboard/pay?quotaIds=${ids}&unitId=${selectedUnitId}`)
            }}
          >
            Pagar seleccionadas
          </Button>
        </div>
      )}

      {/* Table (desktop) + Cards (mobile) */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-default-200 bg-content1 py-12 text-center">
          <Receipt className="mb-3 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t.empty}
          </Typography>
        </div>
      ) : (
        <>
          {/* Desktop Table (hidden on mobile, custom cards below) */}
          <Table<TQuotaRow>
            key={`quotas-table-${selectedIds.size}-${Array.from(selectedIds).join(',')}`}
            aria-label={t.title}
            classNames={{ base: 'hidden md:block' }}
            columns={columns}
            mobileCards={false}
            renderCell={renderCell}
            rows={rows}
            selectionMode="none"
            onRowClick={handleRowClick}
          />

          {/* Mobile Cards (custom, with checkboxes) */}
          <div className="block space-y-3 md:hidden">
            {/* Select all on mobile */}
            {payableRows.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  color="primary"
                  isIndeterminate={somePageSelected && !allPageSelected}
                  isSelected={allPageSelected}
                  onValueChange={toggleSelectAll}
                />
                <Typography color="muted" variant="caption">
                  Seleccionar todas
                </Typography>
              </div>
            )}

            {rows.map(row => {
              const currencySymbol = row.currency?.symbol ?? '$'
              const chipColor = STATUS_CHIP_COLOR[row.status as TQuotaStatus] ?? 'default'
              const canSelect = isPayable(row.status)
              const isSelected = selectedIds.has(row.id)
              const balance = parseFloat(row.balance)
              const base = parseFloat(row.baseAmount)
              const hasBalance = balance !== base && balance > 0

              return (
                <div
                  key={row.id}
                  className={`rounded-lg border bg-content1 p-3 transition-colors cursor-pointer active:bg-default-100 ${
                    isSelected ? 'border-primary-300 bg-primary-50/50' : 'border-default-200'
                  }`}
                  onClick={() => handleRowClick(row)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div
                      className="pt-0.5"
                      onClick={e => {
                        e.stopPropagation()
                        toggleRow(row.id)
                      }}
                    >
                      <Checkbox
                        color="primary"
                        isDisabled={!canSelect}
                        isSelected={canSelect && isSelected}
                        onValueChange={() => toggleRow(row.id)}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Typography className="truncate font-medium" variant="body2">
                          {row.paymentConcept?.name ?? row.periodDescription ?? '-'}
                        </Typography>
                        <Chip color={chipColor} variant="flat">
                          {t.status[row.status] ?? row.status}
                        </Chip>
                      </div>

                      <Typography className="mt-1" color="muted" variant="caption">
                        {formatPeriod(row.periodYear, row.periodMonth, row.periodDescription)}
                      </Typography>

                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div>
                          <Typography color="muted" variant="caption">
                            {t.dueDate}: {formatDateES(row.dueDate)}
                          </Typography>
                        </div>
                        <div className="text-right">
                          <Typography variant="body2">
                            {formatAmountES(row.baseAmount, currencySymbol)}
                          </Typography>
                          {hasBalance && (
                            <Typography className="text-warning-600" variant="caption">
                              {t.balance}: {formatAmountES(row.balance, currencySymbol)}
                            </Typography>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={[10, 20, 50]}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onLimitChange={newLimit => updateUrl({ limit: newLimit, page: 1 })}
            onPageChange={newPage => updateUrl({ page: newPage })}
          />
        </>
      )}
    </div>
  )
}
