'use client'

import { useState, useCallback, useMemo } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Spinner } from '@/ui/components/spinner'
import { ClearFiltersButton } from '@/ui/components/filters'
import { CreditCard, Search, MoreVertical, Eye, CheckCircle, XCircle, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TPayment, TPaymentStatus } from '@packages/domain'

import { useTranslation, useCondominium } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import {
  usePaymentsPaginated,
  verifyPayment,
  rejectPayment,
  paymentKeys,
  useQueryClient,
  downloadDebtorsReport,
} from '@packages/http-client'
import type { TReportFormat } from '@packages/http-client'
import { useToast } from '@/ui/components/toast'

type TStatusFilter = TPaymentStatus | 'all'

type TPaymentRow = TPayment & { id: string }

export function PaymentsTable() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { selectedCondominium } = useCondominium()

  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('pending_verification')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [exporting, setExporting] = useState<TReportFormat | null>(null)

  // Build query
  const query = useMemo(
    () => ({
      page,
      limit,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    [page, limit, statusFilter]
  )

  // Fetch data from API
  const { data, isLoading, error, refetch } = usePaymentsPaginated({ query })

  const payments = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.payments.status.all') },
      { key: 'pending', label: t('admin.payments.status.pending') },
      { key: 'pending_verification', label: t('admin.payments.status.pending_verification') },
      { key: 'completed', label: t('admin.payments.status.completed') },
      { key: 'failed', label: t('admin.payments.status.failed') },
      { key: 'refunded', label: t('admin.payments.status.refunded') },
      { key: 'rejected', label: t('admin.payments.status.rejected') },
    ],
    [t]
  )

  // Table columns
  const tableColumns: ITableColumn<TPaymentRow>[] = useMemo(
    () => [
      { key: 'paymentNumber', label: t('admin.payments.table.paymentNumber') },
      { key: 'user', label: t('admin.payments.table.user') },
      { key: 'unit', label: t('admin.payments.table.unit') },
      { key: 'amount', label: t('admin.payments.table.amount') },
      { key: 'method', label: t('admin.payments.table.method') },
      { key: 'date', label: t('admin.payments.table.date') },
      { key: 'status', label: t('admin.payments.table.status') },
      { key: 'actions', label: t('admin.payments.table.actions') },
    ],
    [t]
  )

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) {
      setStatusFilter(key as TStatusFilter)
      setPage(1)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('pending_verification')
    setPage(1)
  }, [])

  const handleExport = useCallback(
    async (format: TReportFormat) => {
      const condominiumId = selectedCondominium?.condominium?.id
      if (!condominiumId) return

      setExporting(format)
      try {
        await downloadDebtorsReport({ condominiumId, format })
        toast.success(t('admin.payments.export.success'))
      } catch {
        toast.error(t('admin.payments.export.error'))
      } finally {
        setExporting(null)
      }
    },
    [selectedCondominium, t, toast]
  )

  const handleViewDetails = useCallback(
    (id: string) => {
      router.push(`/dashboard/payments/${id}`)
    },
    [router]
  )

  const handleVerify = useCallback(
    async (payment: TPayment) => {
      if (!window.confirm(t('admin.payments.actions.confirmVerify'))) return

      setActionInProgress(payment.id)
      try {
        await verifyPayment(payment.id)
        queryClient.invalidateQueries({ queryKey: paymentKeys.all })
        toast.success(t('admin.payments.actions.verifySuccess'))
      } catch {
        toast.error(t('admin.payments.actions.verifyError'))
      } finally {
        setActionInProgress(null)
      }
    },
    [queryClient, t, toast]
  )

  const handleReject = useCallback(
    async (payment: TPayment) => {
      if (!window.confirm(t('admin.payments.actions.confirmReject'))) return

      setActionInProgress(payment.id)
      try {
        await rejectPayment(payment.id)
        queryClient.invalidateQueries({ queryKey: paymentKeys.all })
        toast.success(t('admin.payments.actions.rejectSuccess'))
      } catch {
        toast.error(t('admin.payments.actions.rejectError'))
      } finally {
        setActionInProgress(null)
      }
    },
    [queryClient, t, toast]
  )

  const getStatusColor = (status: TPaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'pending_verification':
        return 'secondary'
      case 'completed':
        return 'success'
      case 'failed':
        return 'danger'
      case 'refunded':
        return 'primary'
      case 'rejected':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const key = `admin.payments.method.${method}`
    return t(key)
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString()
  }

  const formatAmount = (amount: string | null) => {
    if (!amount) return '-'
    const num = parseFloat(amount)
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const renderCell = useCallback(
    (payment: TPayment, columnKey: string) => {
      switch (columnKey) {
        case 'paymentNumber':
          return (
            <span className="font-medium text-sm">
              {payment.paymentNumber || '-'}
            </span>
          )
        case 'user':
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {payment.user
                  ? `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() || payment.user.email
                  : '-'}
              </span>
              {payment.user?.email && (
                <span className="text-xs text-default-500">{payment.user.email}</span>
              )}
            </div>
          )
        case 'unit':
          return (
            <span className="text-sm">
              {payment.unit?.unitNumber || '-'}
            </span>
          )
        case 'amount':
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{formatAmount(payment.amount)}</span>
              {payment.currency && (
                <span className="text-xs text-default-500">{payment.currency.code}</span>
              )}
            </div>
          )
        case 'method':
          return (
            <span className="text-sm">{getPaymentMethodLabel(payment.paymentMethod)}</span>
          )
        case 'date':
          return <span className="text-sm">{formatDate(payment.paymentDate)}</span>
        case 'status':
          return (
            <Chip color={getStatusColor(payment.status)} variant="flat">
              {t(`admin.payments.status.${payment.status}`)}
            </Chip>
          )
        case 'actions': {
          const isPendingVerification = payment.status === 'pending_verification'
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
                    onPress={() => handleViewDetails(payment.id)}
                  >
                    {t('admin.payments.actions.view')}
                  </DropdownItem>
                  <DropdownItem
                    key="verify"
                    className={isPendingVerification ? '' : 'hidden'}
                    color="success"
                    isDisabled={actionInProgress === payment.id}
                    startContent={
                      actionInProgress === payment.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <CheckCircle size={16} />
                      )
                    }
                    onPress={() => handleVerify(payment)}
                  >
                    {t('admin.payments.actions.verify')}
                  </DropdownItem>
                  <DropdownItem
                    key="reject"
                    className={isPendingVerification ? '' : 'hidden'}
                    color="danger"
                    isDisabled={actionInProgress === payment.id}
                    startContent={
                      actionInProgress === payment.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <XCircle size={16} />
                      )
                    }
                    onPress={() => handleReject(payment)}
                  >
                    {t('admin.payments.actions.reject')}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          )
        }
        default:
          return null
      }
    },
    [t, handleViewDetails, handleVerify, handleReject, actionInProgress]
  )

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('admin.payments.error')}
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
          <Input
            className="w-full sm:max-w-xs"
            placeholder={t('admin.payments.filters.searchPlaceholder')}
            startContent={<Search className="text-default-400" size={16} />}
            value={search}
            onValueChange={handleSearchChange}
          />
          <Select
            aria-label={t('admin.payments.filters.status')}
            className="w-full sm:w-48"
            items={statusFilterItems}
            value={statusFilter}
            onChange={handleStatusChange}
            variant="bordered"
          />
          {(search || statusFilter !== 'pending_verification') && (
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
            {t('admin.payments.export.csv')}
          </Button>
          <Button
            size="sm"
            variant="bordered"
            startContent={<Download size={16} />}
            isLoading={exporting === 'pdf'}
            isDisabled={exporting !== null}
            onPress={() => handleExport('pdf')}
          >
            {t('admin.payments.export.pdf')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <CreditCard className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('admin.payments.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.payments.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TPaymentRow>
            aria-label={t('admin.payments.title')}
            columns={tableColumns}
            rows={payments}
            renderCell={renderCell}
            onRowClick={payment => handleViewDetails(payment.id)}
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
