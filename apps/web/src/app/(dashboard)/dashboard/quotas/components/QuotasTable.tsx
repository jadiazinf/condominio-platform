'use client'

import { useState, useCallback, useMemo } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Spinner } from '@/ui/components/spinner'
import { ClearFiltersButton } from '@/ui/components/filters'
import { Receipt, MoreVertical, Eye, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TQuota } from '@packages/domain'

import { useTranslation, useCondominium } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import { useQuotas, quotaKeys, useQueryClient, downloadDebtorsReport } from '@packages/http-client'
import type { TReportFormat } from '@packages/http-client'

type TStatusFilter = 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled'

type TQuotaRow = TQuota & { id: string }

const STATUS_COLOR_MAP: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  pending: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'default',
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function QuotasTable() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { selectedCondominium } = useCondominium()
  const toast = useToast()

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [exporting, setExporting] = useState<TReportFormat | null>(null)

  // Fetch data from API
  const { data, isLoading, error, refetch } = useQuotas()

  const allQuotas = data?.data ?? []

  // Client-side filtering by status
  const filteredQuotas = useMemo(() => {
    if (statusFilter === 'all') return allQuotas
    return allQuotas.filter(q => q.status === statusFilter)
  }, [allQuotas, statusFilter])

  // Client-side pagination
  const total = filteredQuotas.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const paginatedQuotas = useMemo(() => {
    const start = (page - 1) * limit
    return filteredQuotas.slice(start, start + limit)
  }, [filteredQuotas, page, limit])

  const pagination = { page, limit, total, totalPages }

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.quotas.status.all') },
      { key: 'pending', label: t('admin.quotas.status.pending') },
      { key: 'paid', label: t('admin.quotas.status.paid') },
      { key: 'overdue', label: t('admin.quotas.status.overdue') },
      { key: 'cancelled', label: t('admin.quotas.status.cancelled') },
    ],
    [t]
  )

  // Table columns
  const tableColumns: ITableColumn<TQuotaRow>[] = useMemo(
    () => [
      { key: 'unit', label: t('admin.quotas.table.unit') },
      { key: 'concept', label: t('admin.quotas.table.concept') },
      { key: 'period', label: t('admin.quotas.table.period') },
      { key: 'amount', label: t('admin.quotas.table.amount') },
      { key: 'dueDate', label: t('admin.quotas.table.dueDate') },
      { key: 'status', label: t('admin.quotas.table.status') },
      { key: 'balance', label: t('admin.quotas.table.balance') },
      { key: 'actions', label: t('admin.quotas.table.actions') },
    ],
    [t]
  )

  // Handlers
  const handleStatusChange = useCallback((key: string | null) => {
    if (key) {
      setStatusFilter(key as TStatusFilter)
      setPage(1)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setStatusFilter('all')
    setPage(1)
  }, [])

  const handleExport = useCallback(
    async (format: TReportFormat) => {
      const condominiumId = selectedCondominium?.condominium?.id
      if (!condominiumId) return

      setExporting(format)
      try {
        await downloadDebtorsReport({ condominiumId, format })
        toast.success(t('admin.quotas.export.success'))
      } catch {
        toast.error(t('admin.quotas.export.error'))
      } finally {
        setExporting(null)
      }
    },
    [selectedCondominium, t, toast]
  )

  const handleViewDetails = useCallback(
    (id: string) => {
      router.push(`/dashboard/quotas/${id}`)
    },
    [router]
  )

  const formatCurrency = (value: number | string, symbol?: string | null) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    const currencySymbol = symbol || '$'
    return `${currencySymbol}${num.toFixed(2)}`
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString()
  }

  const formatPeriod = (year: number, month: number | null) => {
    if (month && month >= 1 && month <= 12) {
      return `${MONTH_NAMES[month - 1]} ${year}`
    }
    return `${year}`
  }

  const renderCell = useCallback(
    (quota: TQuota, columnKey: string) => {
      switch (columnKey) {
        case 'unit':
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {quota.unit?.unitNumber ?? '-'}
              </span>
            </div>
          )
        case 'concept':
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {quota.paymentConcept?.name ?? '-'}
              </span>
              {quota.periodDescription && (
                <span className="text-xs text-default-500">{quota.periodDescription}</span>
              )}
            </div>
          )
        case 'period':
          return (
            <span className="text-sm">
              {formatPeriod(quota.periodYear, quota.periodMonth)}
            </span>
          )
        case 'amount':
          return (
            <span className="text-sm font-medium">
              {formatCurrency(quota.baseAmount, quota.currency?.symbol)}
            </span>
          )
        case 'dueDate':
          return <span className="text-sm">{formatDate(quota.dueDate)}</span>
        case 'status':
          return (
            <Chip
              color={STATUS_COLOR_MAP[quota.status] || 'default'}
              variant="flat"
            >
              {t(`admin.quotas.status.${quota.status}`)}
            </Chip>
          )
        case 'balance':
          return (
            <span className="text-sm font-medium">
              {formatCurrency(quota.balance, quota.currency?.symbol)}
            </span>
          )
        case 'actions':
          return (
            <div onClick={e => e.stopPropagation()}>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly variant="light">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Actions">
                  <DropdownItem
                    key="view"
                    startContent={<Eye size={16} />}
                    onPress={() => handleViewDetails(quota.id)}
                  >
                    {t('admin.quotas.actions.view')}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          )
        default:
          return null
      }
    },
    [t, handleViewDetails]
  )

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('common.retry')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            aria-label={t('admin.quotas.filters.status')}
            className="w-full sm:w-40"
            items={statusFilterItems}
            value={statusFilter}
            onChange={handleStatusChange}
            variant="bordered"
          />
          {statusFilter !== 'all' && (
            <ClearFiltersButton onClear={handleClearFilters} />
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="bordered"
            startContent={<Download size={16} />}
            isLoading={exporting === 'csv'}
            isDisabled={exporting !== null}
            onPress={() => handleExport('csv')}
          >
            {t('admin.quotas.export.csv')}
          </Button>
          <Button
            size="sm"
            variant="bordered"
            startContent={<Download size={16} />}
            isLoading={exporting === 'pdf'}
            isDisabled={exporting !== null}
            onPress={() => handleExport('pdf')}
          >
            {t('admin.quotas.export.pdf')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : paginatedQuotas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Receipt className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('admin.quotas.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.quotas.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TQuotaRow>
            aria-label={t('admin.quotas.title')}
            columns={tableColumns}
            rows={paginatedQuotas}
            renderCell={renderCell}
            onRowClick={quota => handleViewDetails(quota.id)}
            classNames={{
              tr: 'cursor-pointer transition-colors hover:bg-default-100',
            }}
          />

          {/* Pagination */}
          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={[10, 20, 50, 100]}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onLimitChange={newLimit => {
              setLimit(newLimit)
              setPage(1)
            }}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
