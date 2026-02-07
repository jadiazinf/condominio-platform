'use client'

import { useState, useCallback, useMemo } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Input } from '@/ui/components/input'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Spinner } from '@/ui/components/spinner'
import { ClearFiltersButton } from '@/ui/components/filters'
import { Pagination } from '@/ui/components/pagination'
import { ArrowRightLeft, MoreVertical, Trash2 } from 'lucide-react'
import type { TExchangeRate, TCurrency } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import {
  useExchangeRatesPaginated,
  useCurrencies,
  useDeleteExchangeRate,
  exchangeRateKeys,
  useQueryClient,
} from '@packages/http-client'
import { useToast } from '@/ui/components/toast'

type TRateRow = TExchangeRate & { id: string }

export function ExchangeRateHistoryTable() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Filter state
  const [fromCurrencyId, setFromCurrencyId] = useState<string>('')
  const [toCurrencyId, setToCurrencyId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Fetch currencies for filter dropdowns
  const { data: currenciesData, isLoading: currenciesLoading } = useCurrencies()

  const currencyItems: ISelectItem[] = useMemo(
    () => [
      { key: '', label: t('superadmin.currencies.status.all') },
      ...(currenciesData?.data ?? []).map((c) => ({
        key: c.id,
        label: `${c.code} - ${c.name}`,
      })),
    ],
    [currenciesData, t]
  )

  // Build query
  const query = useMemo(
    () => ({
      page,
      limit,
      fromCurrencyId: fromCurrencyId || undefined,
      toCurrencyId: toCurrencyId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [page, limit, fromCurrencyId, toCurrencyId, dateFrom, dateTo]
  )

  const { data, isLoading, error, refetch } = useExchangeRatesPaginated({ query })

  const rates = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  // Currency lookup map
  const currencyMap = useMemo(() => {
    const map = new Map<string, TCurrency>()
    for (const c of currenciesData?.data ?? []) {
      map.set(c.id, c)
    }
    return map
  }, [currenciesData])

  const getCurrencyCode = useCallback(
    (id: string) => currencyMap.get(id)?.code ?? id,
    [currencyMap]
  )

  // Delete mutation
  const deleteMutation = useDeleteExchangeRate({
    onSuccess: () => {
      toast.success(t('superadmin.currencies.exchangeRates.actions.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: exchangeRateKeys.all })
    },
    onError: () => {
      toast.error(t('superadmin.currencies.exchangeRates.actions.deleteError'))
    },
  })

  const isDeleting = deleteMutation.isPending

  const hasFilters = fromCurrencyId || toCurrencyId || dateFrom || dateTo

  const handleClearFilters = useCallback(() => {
    setFromCurrencyId('')
    setToCurrencyId('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }, [])

  const handleDelete = useCallback(
    (rate: TExchangeRate) => {
      deleteMutation.mutate({ id: rate.id })
    },
    [deleteMutation]
  )

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(`${date}T12:00:00`) : date
    return d.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' ' + d.toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const tableColumns: ITableColumn<TRateRow>[] = useMemo(
    () => [
      { key: 'fromCurrency', label: t('superadmin.currencies.exchangeRates.table.fromCurrency') },
      { key: 'toCurrency', label: t('superadmin.currencies.exchangeRates.table.toCurrency') },
      { key: 'rate', label: t('superadmin.currencies.exchangeRates.table.rate') },
      { key: 'effectiveDate', label: t('superadmin.currencies.exchangeRates.table.effectiveDate') },
      { key: 'source', label: t('superadmin.currencies.exchangeRates.table.source') },
      { key: 'createdAt', label: t('superadmin.currencies.exchangeRates.table.createdAt') },
      { key: 'actions', label: t('superadmin.currencies.exchangeRates.table.actions') },
    ],
    [t]
  )

  const renderCell = useCallback(
    (rate: TExchangeRate, columnKey: string) => {
      switch (columnKey) {
        case 'fromCurrency':
          return (
            <div className="flex flex-col">
              <span className="font-mono font-semibold">{getCurrencyCode(rate.fromCurrencyId)}</span>
              <span className="text-xs text-default-500">
                {currencyMap.get(rate.fromCurrencyId)?.name ?? ''}
              </span>
            </div>
          )
        case 'toCurrency':
          return (
            <div className="flex flex-col">
              <span className="font-mono font-semibold">{getCurrencyCode(rate.toCurrencyId)}</span>
              <span className="text-xs text-default-500">
                {currencyMap.get(rate.toCurrencyId)?.name ?? ''}
              </span>
            </div>
          )
        case 'rate':
          return (
            <span className="text-sm font-medium">
              {parseFloat(rate.rate).toFixed(
                currencyMap.get(rate.toCurrencyId)?.decimals ?? 2
              )}
            </span>
          )
        case 'effectiveDate':
          return <span className="text-sm">{formatDate(rate.effectiveDate)}</span>
        case 'source':
          return rate.source ? (
            <Chip variant="flat" size="sm">
              {rate.source}
            </Chip>
          ) : (
            <span className="text-default-400">—</span>
          )
        case 'createdAt':
          return <span className="text-xs text-default-500">{formatDateTime(rate.createdAt)}</span>
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
                  <DropdownItem
                    key="delete"
                    color="danger"
                    isDisabled={isDeleting}
                    startContent={isDeleting ? <Spinner size="sm" /> : <Trash2 size={16} />}
                    onPress={() => handleDelete(rate)}
                  >
                    {t('superadmin.currencies.exchangeRates.actions.delete')}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          )
        default:
          return null
      }
    },
    [getCurrencyCode, currencyMap, t, handleDelete, isDeleting]
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
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <Select
          aria-label={t('superadmin.currencies.exchangeRates.filters.fromCurrency')}
          className="w-full sm:w-48"
          items={currencyItems}
          label={t('superadmin.currencies.exchangeRates.filters.fromCurrency')}
          value={fromCurrencyId}
          onChange={(key) => {
            setFromCurrencyId(key ?? '')
            setPage(1)
          }}
          isLoading={currenciesLoading}
          variant="bordered"
        />
        <Select
          aria-label={t('superadmin.currencies.exchangeRates.filters.toCurrency')}
          className="w-full sm:w-48"
          items={currencyItems}
          label={t('superadmin.currencies.exchangeRates.filters.toCurrency')}
          value={toCurrencyId}
          onChange={(key) => {
            setToCurrencyId(key ?? '')
            setPage(1)
          }}
          isLoading={currenciesLoading}
          variant="bordered"
        />
        <Input
          type="date"
          label={t('superadmin.currencies.exchangeRates.filters.dateFrom')}
          className="w-full sm:w-44"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(typeof e === 'string' ? e : (e?.target as HTMLInputElement)?.value ?? '')
            setPage(1)
          }}
        />
        <Input
          type="date"
          label={t('superadmin.currencies.exchangeRates.filters.dateTo')}
          className="w-full sm:w-44"
          value={dateTo}
          onChange={(e) => {
            setDateTo(typeof e === 'string' ? e : (e?.target as HTMLInputElement)?.value ?? '')
            setPage(1)
          }}
        />
        {hasFilters && <ClearFiltersButton onClear={handleClearFilters} />}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : rates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <ArrowRightLeft className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('superadmin.currencies.exchangeRates.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.currencies.exchangeRates.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TRateRow>
            aria-label={t('superadmin.currencies.exchangeRates.history.title')}
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
            onLimitChange={(newLimit) => {
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
