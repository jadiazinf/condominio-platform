'use client'

import { useMemo, useCallback } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { Button } from '@/ui/components/button'
import { ArrowRightLeft, Plus } from 'lucide-react'
import type { TExchangeRate, TCurrency } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import {
  useLatestExchangeRates,
  useCurrencies,
} from '@packages/http-client'

type TRateRow = TExchangeRate & { id: string }

export function CurrentRatesTable() {
  const { t } = useTranslation()

  const { data: ratesData, isLoading: ratesLoading, error, refetch } = useLatestExchangeRates()
  const { data: currenciesData, isLoading: currenciesLoading } = useCurrencies()

  const isLoading = ratesLoading || currenciesLoading
  const rates = ratesData?.data ?? []

  // Build currency lookup map
  const currencyMap = useMemo(() => {
    const map = new Map<string, TCurrency>()
    for (const c of currenciesData?.data ?? []) {
      map.set(c.id, c)
    }
    return map
  }, [currenciesData])

  const getCurrencyCode = useCallback(
    (id: string) => {
      const c = currencyMap.get(id)
      return c?.code ?? id
    },
    [currencyMap]
  )

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(`${date}T12:00:00`) : date
    return d.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleTimeString('es-VE', {
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
          return (
            <div className="flex flex-col">
              <span className="text-sm">{formatDate(rate.effectiveDate)}</span>
              <span className="text-xs text-default-500">{formatTime(rate.createdAt)}</span>
            </div>
          )
        case 'source':
          return rate.source ? (
            <Chip variant="flat" size="sm">
              {rate.source}
            </Chip>
          ) : (
            <span className="text-default-400">—</span>
          )
        default:
          return null
      }
    },
    [getCurrencyCode, currencyMap]
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
      {/* Create Button */}
      <div className="flex justify-end">
        <Button
          color="primary"
          href="/dashboard/currencies/exchange-rates/create"
          startContent={<Plus size={18} />}
        >
          {t('superadmin.currencies.exchangeRates.create')}
        </Button>
      </div>

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
        <Table<TRateRow>
          aria-label={t('superadmin.currencies.exchangeRates.title')}
          columns={tableColumns}
          rows={rates}
          renderCell={renderCell}
        />
      )}
    </div>
  )
}
