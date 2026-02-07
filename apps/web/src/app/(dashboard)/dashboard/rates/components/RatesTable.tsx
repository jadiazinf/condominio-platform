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
import { DollarSign, Search, MoreVertical, Power } from 'lucide-react'
import type { TSubscriptionRate } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import {
  useSubscriptionRates,
  useActivateSubscriptionRate,
  useDeactivateSubscriptionRate,
  subscriptionRateKeys,
  useQueryClient,
} from '@packages/http-client'
import { useToast } from '@/ui/components/toast'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TRateRow = TSubscriptionRate & { id: string }

export function RatesTable() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Build query
  const query = useMemo(
    () => ({
      page,
      limit,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
    [page, limit, statusFilter]
  )

  // Fetch data from API
  const { data, isLoading, error, refetch } = useSubscriptionRates({ query })

  const rates = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  // Mutations
  const activateMutation = useActivateSubscriptionRate({
    onSuccess: () => {
      toast.success(t('superadmin.rates.actions.activateSuccess'))
      queryClient.invalidateQueries({ queryKey: subscriptionRateKeys.all })
    },
    onError: () => {
      toast.error(t('superadmin.rates.actions.toggleError'))
    },
  })

  const deactivateMutation = useDeactivateSubscriptionRate({
    onSuccess: () => {
      toast.success(t('superadmin.rates.actions.deactivateSuccess'))
      queryClient.invalidateQueries({ queryKey: subscriptionRateKeys.all })
    },
    onError: () => {
      toast.error(t('superadmin.rates.actions.toggleError'))
    },
  })

  const isToggling = activateMutation.isPending || deactivateMutation.isPending

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('superadmin.rates.status.all') },
      { key: 'active', label: t('superadmin.rates.status.active') },
      { key: 'inactive', label: t('superadmin.rates.status.inactive') },
    ],
    [t]
  )

  // Table columns
  const tableColumns: ITableColumn<TRateRow>[] = useMemo(
    () => [
      { key: 'name', label: t('superadmin.rates.table.name') },
      { key: 'version', label: t('superadmin.rates.table.version') },
      { key: 'condominiumRate', label: t('superadmin.rates.table.condominiumRate') },
      { key: 'unitRate', label: t('superadmin.rates.table.unitRate') },
      { key: 'userRate', label: t('superadmin.rates.table.userRate') },
      { key: 'annualDiscount', label: t('superadmin.rates.table.annualDiscount') },
      { key: 'status', label: t('superadmin.rates.table.status') },
      { key: 'effectiveFrom', label: t('superadmin.rates.table.effectiveFrom') },
      { key: 'actions', label: t('superadmin.rates.table.actions') },
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
    setStatusFilter('active')
    setPage(1)
  }, [])

  const handleToggleActive = useCallback(
    (rate: TSubscriptionRate) => {
      if (rate.isActive) {
        deactivateMutation.mutate({ id: rate.id })
      } else {
        activateMutation.mutate({ id: rate.id })
      }
    },
    [activateMutation, deactivateMutation]
  )

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return `$${num.toFixed(2)}`
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString()
  }

  const renderCell = useCallback(
    (rate: TSubscriptionRate, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return (
            <div className="flex flex-col">
              <span className="font-medium">{rate.name}</span>
              {rate.description && (
                <span className="text-xs text-default-500">{rate.description}</span>
              )}
            </div>
          )
        case 'version':
          return <Chip variant="flat">{rate.version}</Chip>
        case 'condominiumRate':
          return <span className="text-sm font-medium">{formatCurrency(rate.condominiumRate)}</span>
        case 'unitRate':
          return <span className="text-sm font-medium">{formatCurrency(rate.unitRate)}</span>
        case 'userRate':
          return <span className="text-sm font-medium">{formatCurrency(rate.userRate)}</span>
        case 'annualDiscount':
          return <span className="text-sm">{rate.annualDiscountPercentage}%</span>
        case 'status':
          return (
            <Chip color={rate.isActive ? 'success' : 'default'} variant="flat">
              {rate.isActive
                ? t('superadmin.rates.status.active')
                : t('superadmin.rates.status.inactive')}
            </Chip>
          )
        case 'effectiveFrom':
          return <span className="text-sm">{formatDate(rate.effectiveFrom)}</span>
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
                    key="toggle"
                    color={rate.isActive ? 'warning' : 'success'}
                    isDisabled={isToggling}
                    startContent={isToggling ? <Spinner size="sm" /> : <Power size={16} />}
                    onPress={() => handleToggleActive(rate)}
                  >
                    {rate.isActive
                      ? t('superadmin.rates.actions.deactivate')
                      : t('superadmin.rates.actions.activate')}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          )
        default:
          return null
      }
    },
    [t, handleToggleActive, isToggling]
  )

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('superadmin.rates.actions.toggleError')}
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Select
          aria-label={t('superadmin.rates.filters.status')}
          className="w-full sm:w-40"
          items={statusFilterItems}
          value={statusFilter}
          onChange={handleStatusChange}
          variant="bordered"
        />
        {statusFilter !== 'active' && (
          <ClearFiltersButton onClear={handleClearFilters} />
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : rates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <DollarSign className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('superadmin.rates.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.rates.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TRateRow>
            aria-label={t('superadmin.rates.title')}
            columns={tableColumns}
            rows={rates}
            renderCell={renderCell}
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
