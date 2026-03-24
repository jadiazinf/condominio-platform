'use client'

import type { TPayment, TPaymentStatus } from '@packages/domain'
import type { TReportFormat } from '@packages/http-client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { CreditCard, Search, MoreVertical, Eye, CheckCircle, XCircle, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  usePaymentsPaginated,
  useCompanyCondominiumsPaginated,
  useMyCompanyBankAccountsPaginated,
  verifyPayment,
  rejectPayment,
  paymentKeys,
  useQueryClient,
  downloadDebtorsReport,
} from '@packages/http-client'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Input } from '@/ui/components/input'
import { DatePicker } from '@/ui/components/date-picker'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Spinner } from '@/ui/components/spinner'
import { ClearFiltersButton } from '@/ui/components/filters'
import { ConvertedAmount } from '@/ui/components/currency/ConvertedAmount'
import { getPaymentStatusColor } from '@/utils/status-colors'
import { useDebouncedValue } from '@/hooks'
import { useTranslation, useCondominium } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import { useSessionStore } from '@/stores'
import { useToast } from '@/ui/components/toast'

type TStatusFilter = TPaymentStatus | 'all'

type TPaymentRow = TPayment & { id: string }

export function PaymentsTable() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { selectedCondominium } = useCondominium()
  const managementCompanies = useSessionStore(s => s.managementCompanies)
  const managementCompanyId = managementCompanies?.[0]?.managementCompanyId ?? ''

  // Filter state
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput)
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('pending_verification')
  const [condominiumFilter, setCondominiumFilter] = useState('')
  const [bankAccountFilter, setBankAccountFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [exporting, setExporting] = useState<TReportFormat | null>(null)
  const isFirstRender = useRef(true)

  // Reset page when debounced search changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false

      return
    }
    setPage(1)
  }, [debouncedSearch])

  // Fetch condominiums for filter
  const { data: condominiumsData } = useCompanyCondominiumsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 100 },
    enabled: !!managementCompanyId,
  })
  const condominiums = condominiumsData?.data ?? []

  // Fetch bank accounts for filter
  const { data: bankAccountsData } = useMyCompanyBankAccountsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 100, isActive: true },
    enabled: !!managementCompanyId,
  })
  const bankAccounts = bankAccountsData?.data ?? []

  // Build query
  const query = useMemo(
    () => ({
      page,
      limit,
      status: statusFilter === 'all' ? undefined : statusFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, limit, statusFilter, startDate, endDate]
  )

  // Fetch data from API
  const { data, isLoading, error, refetch } = usePaymentsPaginated({ query })

  const rawPayments = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  // Client-side condominium filter (API doesn't support condominiumId filter directly)
  const payments = useMemo(() => {
    if (!condominiumFilter) return rawPayments

    return rawPayments.filter(
      (p: any) =>
        p.unit?.building?.condominiumId === condominiumFilter ||
        p.unit?.building?.condominium?.id === condominiumFilter
    )
  }, [rawPayments, condominiumFilter])

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
  const handleStatusChange = useCallback((key: string | null) => {
    if (key) {
      setStatusFilter(key as TStatusFilter)
      setPage(1)
    }
  }, [])

  const handleCondominiumChange = useCallback((key: string | null) => {
    setCondominiumFilter(key ?? '')
    setPage(1)
  }, [])

  const condominiumFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: '', label: t('admin.payments.filters.condominiumAll') },
      ...condominiums.map((c: any) => ({ key: c.id, label: c.name })),
    ],
    [condominiums, t]
  )

  const handleBankAccountChange = useCallback((key: string | null) => {
    setBankAccountFilter(key ?? '')
    setPage(1)
  }, [])

  const bankAccountFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: '', label: t('admin.payments.filters.bankAll') },
      ...bankAccounts.map((b: any) => ({
        key: b.id,
        label: `${b.bankName} - ${b.accountNumber?.slice(-4) ?? ''}`,
      })),
    ],
    [bankAccounts, t]
  )

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setStatusFilter('pending_verification')
    setCondominiumFilter('')
    setBankAccountFilter('')
    setStartDate('')
    setEndDate('')
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

  const getPaymentMethodLabel = (method: string) => {
    const key = `admin.payments.method.${method}`

    return t(key)
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date

    return d.toLocaleDateString()
  }

  const renderCell = useCallback(
    (payment: TPayment, columnKey: string) => {
      switch (columnKey) {
        case 'paymentNumber':
          return <span className="font-medium text-sm">{payment.paymentNumber || '-'}</span>
        case 'user':
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {payment.user
                  ? `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() ||
                    payment.user.email
                  : '-'}
              </span>
              {payment.user?.email && (
                <span className="text-xs text-default-500">{payment.user.email}</span>
              )}
            </div>
          )
        case 'unit':
          return <span className="text-sm">{payment.unit?.unitNumber || '-'}</span>
        case 'amount':
          return (
            <ConvertedAmount
              amount={payment.amount}
              currencyCode={payment.currency?.code}
              currencySymbol={payment.currency?.symbol}
              isBaseCurrency={payment.currency?.isBaseCurrency}
            />
          )
        case 'method':
          return <span className="text-sm">{getPaymentMethodLabel(payment.paymentMethod)}</span>
        case 'date':
          return <span className="text-sm">{formatDate(payment.paymentDate)}</span>
        case 'status':
          return (
            <Chip color={getPaymentStatusColor(payment.status)} variant="flat">
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
      {/* Export buttons */}
      <div className="flex justify-end gap-2">
        <Button
          isDisabled={exporting !== null}
          isLoading={exporting === 'csv'}
          startContent={<Download size={16} />}
          variant="bordered"
          onPress={() => handleExport('csv')}
        >
          {t('admin.payments.export.csv')}
        </Button>
        <Button
          isDisabled={exporting !== null}
          isLoading={exporting === 'pdf'}
          startContent={<Download size={16} />}
          variant="bordered"
          onPress={() => handleExport('pdf')}
        >
          {t('admin.payments.export.pdf')}
        </Button>
      </div>

      {/* All filters in one row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t('admin.payments.filters.searchPlaceholder')}
          size="lg"
          startContent={<Search className="text-default-400" size={16} />}
          value={searchInput}
          onValueChange={setSearchInput}
        />
        <Select
          aria-label={t('admin.payments.filters.status')}
          className="w-full sm:w-44"
          items={statusFilterItems}
          size="lg"
          value={statusFilter}
          variant="bordered"
          onChange={handleStatusChange}
        />
        {condominiums.length > 0 && (
          <Select
            aria-label={t('admin.payments.filters.condominium')}
            className="w-full sm:w-56"
            items={condominiumFilterItems}
            placeholder={t('admin.payments.filters.condominiumAll')}
            size="lg"
            value={condominiumFilter}
            variant="bordered"
            onChange={handleCondominiumChange}
          />
        )}
        {bankAccounts.length > 0 && (
          <Select
            aria-label={t('admin.payments.filters.bank')}
            className="w-full sm:w-44"
            items={bankAccountFilterItems}
            placeholder={t('admin.payments.filters.bankAll')}
            value={bankAccountFilter}
            variant="bordered"
            onChange={handleBankAccountChange}
          />
        )}
        <DatePicker
          className="w-full sm:w-36"
          label={t('admin.payments.filters.startDate')}
          value={startDate}
          onChange={v => {
            setStartDate(v)
            setPage(1)
          }}
        />
        <DatePicker
          className="w-full sm:w-36"
          label={t('admin.payments.filters.endDate')}
          value={endDate}
          onChange={v => {
            setEndDate(v)
            setPage(1)
          }}
        />
        {(searchInput ||
          statusFilter !== 'pending_verification' ||
          condominiumFilter ||
          bankAccountFilter ||
          startDate ||
          endDate) && <ClearFiltersButton onClear={handleClearFilters} />}
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
            classNames={{
              tr: 'cursor-pointer transition-colors hover:bg-default-100',
            }}
            columns={tableColumns}
            renderCell={renderCell}
            rows={payments}
            onRowClick={payment => handleViewDetails(payment.id)}
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
