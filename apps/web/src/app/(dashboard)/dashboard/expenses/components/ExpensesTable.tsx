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
import type { TExpense } from '@packages/domain'

import { useTranslation, useCondominium } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import { useExpenses, downloadDebtorsReport } from '@packages/http-client'
import type { TReportFormat } from '@packages/http-client'

type TStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'paid'

type TExpenseRow = TExpense & { id: string }

const STATUS_COLOR_MAP: Record<string, 'warning' | 'success' | 'danger' | 'primary' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  paid: 'primary',
}

export function ExpensesTable() {
  const { t } = useTranslation()
  const router = useRouter()
  const { selectedCondominium } = useCondominium()
  const toast = useToast()

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [exporting, setExporting] = useState<TReportFormat | null>(null)

  // Fetch data from API
  const { data, isLoading, error, refetch } = useExpenses()

  const allExpenses = data?.data ?? []

  // Client-side filtering by status
  const filteredExpenses = useMemo(() => {
    if (statusFilter === 'all') return allExpenses
    return allExpenses.filter(e => e.status === statusFilter)
  }, [allExpenses, statusFilter])

  // Client-side pagination
  const total = filteredExpenses.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * limit
    return filteredExpenses.slice(start, start + limit)
  }, [filteredExpenses, page, limit])

  const pagination = { page, limit, total, totalPages }

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.expenses.status.all') },
      { key: 'pending', label: t('admin.expenses.status.pending') },
      { key: 'approved', label: t('admin.expenses.status.approved') },
      { key: 'rejected', label: t('admin.expenses.status.rejected') },
      { key: 'paid', label: t('admin.expenses.status.paid') },
    ],
    [t]
  )

  // Table columns
  const tableColumns: ITableColumn<TExpenseRow>[] = useMemo(
    () => [
      { key: 'description', label: t('admin.expenses.table.description') },
      { key: 'category', label: t('admin.expenses.table.category') },
      { key: 'amount', label: t('admin.expenses.table.amount') },
      { key: 'expenseDate', label: t('admin.expenses.table.expenseDate') },
      { key: 'vendor', label: t('admin.expenses.table.vendor') },
      { key: 'status', label: t('admin.expenses.table.status') },
      { key: 'actions', label: t('admin.expenses.table.actions') },
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
        toast.success(t('admin.expenses.export.success'))
      } catch {
        toast.error(t('admin.expenses.export.error'))
      } finally {
        setExporting(null)
      }
    },
    [selectedCondominium, t, toast]
  )

  const handleViewDetails = useCallback(
    (id: string) => {
      router.push(`/dashboard/expenses/${id}`)
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

  const renderCell = useCallback(
    (expense: TExpense, columnKey: string) => {
      switch (columnKey) {
        case 'description':
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {expense.description}
              </span>
              {expense.invoiceNumber && (
                <span className="text-xs text-default-500">#{expense.invoiceNumber}</span>
              )}
            </div>
          )
        case 'category':
          return (
            <span className="text-sm">
              {expense.expenseCategory?.name ?? '-'}
            </span>
          )
        case 'amount':
          return (
            <span className="text-sm font-medium">
              {formatCurrency(expense.amount, expense.currency?.symbol)}
            </span>
          )
        case 'expenseDate':
          return <span className="text-sm">{formatDate(expense.expenseDate)}</span>
        case 'vendor':
          return (
            <span className="text-sm">
              {expense.vendorName ?? '-'}
            </span>
          )
        case 'status':
          return (
            <Chip
              color={STATUS_COLOR_MAP[expense.status] || 'default'}
              variant="flat"
            >
              {t(`admin.expenses.status.${expense.status}`)}
            </Chip>
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
                    onPress={() => handleViewDetails(expense.id)}
                  >
                    {t('admin.expenses.actions.view')}
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
            aria-label={t('admin.expenses.filters.status')}
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
            {t('admin.expenses.export.csv')}
          </Button>
          <Button
            size="sm"
            variant="bordered"
            startContent={<Download size={16} />}
            isLoading={exporting === 'pdf'}
            isDisabled={exporting !== null}
            onPress={() => handleExport('pdf')}
          >
            {t('admin.expenses.export.pdf')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : paginatedExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Receipt className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('admin.expenses.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.expenses.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TExpenseRow>
            aria-label={t('admin.expenses.title')}
            columns={tableColumns}
            rows={paginatedExpenses}
            renderCell={renderCell}
            onRowClick={expense => handleViewDetails(expense.id)}
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
