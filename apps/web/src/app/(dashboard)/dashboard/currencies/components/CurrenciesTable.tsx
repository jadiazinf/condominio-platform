'use client'

import { useState, useCallback, useMemo } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Spinner } from '@/ui/components/spinner'
import { ClearFiltersButton } from '@/ui/components/filters'
import { Coins, MoreVertical, Plus, Power, Star } from 'lucide-react'
import type { TCurrency } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import {
  useCurrencies,
  useDeleteCurrency,
  currencyKeys,
  useQueryClient,
} from '@packages/http-client'
import { useToast } from '@/ui/components/toast'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TCurrencyRow = TCurrency & { id: string }

export function CurrenciesTable() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')

  const { data, isLoading, error, refetch } = useCurrencies()

  const allCurrencies = data?.data ?? []

  // Client-side filtering since the list is small
  const currencies = useMemo(() => {
    if (statusFilter === 'all') return allCurrencies
    return allCurrencies.filter((c) =>
      statusFilter === 'active' ? c.isActive : !c.isActive
    )
  }, [allCurrencies, statusFilter])

  const deleteMutation = useDeleteCurrency({
    onSuccess: () => {
      toast.success(t('superadmin.currencies.actions.deactivateSuccess'))
      queryClient.invalidateQueries({ queryKey: currencyKeys.all })
    },
    onError: () => {
      toast.error(t('superadmin.currencies.actions.toggleError'))
    },
  })

  const isToggling = deleteMutation.isPending

  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'active', label: t('superadmin.currencies.status.active') },
      { key: 'inactive', label: t('superadmin.currencies.status.inactive') },
      { key: 'all', label: t('superadmin.currencies.status.all') },
    ],
    [t]
  )

  const tableColumns: ITableColumn<TCurrencyRow>[] = useMemo(
    () => [
      { key: 'code', label: t('superadmin.currencies.table.code') },
      { key: 'name', label: t('superadmin.currencies.table.name') },
      { key: 'symbol', label: t('superadmin.currencies.table.symbol') },
      { key: 'baseCurrency', label: t('superadmin.currencies.table.baseCurrency') },
      { key: 'decimals', label: t('superadmin.currencies.table.decimals') },
      { key: 'status', label: t('superadmin.currencies.table.status') },
      { key: 'actions', label: t('superadmin.currencies.table.actions') },
    ],
    [t]
  )

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) setStatusFilter(key as TStatusFilter)
  }, [])

  const handleClearFilters = useCallback(() => {
    setStatusFilter('active')
  }, [])

  const handleDeactivate = useCallback(
    (currency: TCurrency) => {
      deleteMutation.mutate({ id: currency.id })
    },
    [deleteMutation]
  )

  const renderCell = useCallback(
    (currency: TCurrency, columnKey: string) => {
      switch (columnKey) {
        case 'code':
          return <span className="font-mono font-semibold">{currency.code}</span>
        case 'name':
          return <span>{currency.name}</span>
        case 'symbol':
          return <span className="text-lg">{currency.symbol || '—'}</span>
        case 'baseCurrency':
          return currency.isBaseCurrency ? (
            <Chip color="warning" variant="flat" startContent={<Star size={12} />}>
              Base
            </Chip>
          ) : null
        case 'decimals':
          return <span className="text-sm">{currency.decimals}</span>
        case 'status':
          return (
            <Chip color={currency.isActive ? 'success' : 'default'} variant="flat">
              {currency.isActive
                ? t('superadmin.currencies.status.active')
                : t('superadmin.currencies.status.inactive')}
            </Chip>
          )
        case 'actions':
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly variant="light">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Actions">
                  {currency.isActive ? (
                    <DropdownItem
                      key="deactivate"
                      color="warning"
                      isDisabled={isToggling}
                      startContent={isToggling ? <Spinner size="sm" /> : <Power size={16} />}
                      onPress={() => handleDeactivate(currency)}
                    >
                      {t('superadmin.currencies.actions.deactivate')}
                    </DropdownItem>
                  ) : (
                    <DropdownItem
                      key="activate"
                      color="success"
                      isDisabled
                      startContent={<Power size={16} />}
                    >
                      {t('superadmin.currencies.actions.activate')}
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
            </div>
          )
        default:
          return null
      }
    },
    [t, handleDeactivate, isToggling]
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('common.loadError')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters + Create Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            aria-label={t('superadmin.currencies.filters.status')}
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
        <Button
          color="primary"
          href="/dashboard/currencies/create"
          startContent={<Plus size={18} />}
        >
          {t('superadmin.currencies.create')}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : currencies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Coins className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('superadmin.currencies.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.currencies.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <Table<TCurrencyRow>
          aria-label={t('superadmin.currencies.title')}
          columns={tableColumns}
          rows={currencies}
          renderCell={renderCell}
        />
      )}
    </div>
  )
}
