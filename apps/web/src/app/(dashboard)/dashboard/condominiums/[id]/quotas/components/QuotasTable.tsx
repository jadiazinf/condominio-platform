'use client'

import type { TQuota } from '@packages/domain'

import { useState, useMemo, useCallback } from 'react'
import { Receipt, Search, Calendar } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { Input } from '@/ui/components/input'

type TQuotaStatusFilter =
  | 'all'
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'exonerated'

const STATUS_COLORS = {
  pending: 'warning',
  partial: 'primary',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'default',
  exonerated: 'secondary',
} as const

interface QuotasTableProps {
  quotas: TQuota[]
  translations: {
    title: string
    subtitle: string
    empty: string
    emptyDescription: string
    table: {
      unit: string
      concept: string
      period: string
      amount: string
      balance: string
      status: string
      dueDate: string
    }
    status: {
      pending: string
      partial: string
      paid: string
      overdue: string
      cancelled: string
      exonerated: string
    }
    filters: {
      all: string
      searchPlaceholder: string
      status: string
    }
  }
}

export function QuotasTable({ quotas, translations: t }: QuotasTableProps) {
  const [statusFilter, setStatusFilter] = useState<TQuotaStatusFilter>('all')
  const [searchInput, setSearchInput] = useState('')

  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t.filters.all },
      { key: 'pending', label: t.status.pending },
      { key: 'partial', label: t.status.partial },
      { key: 'paid', label: t.status.paid },
      { key: 'overdue', label: t.status.overdue },
      { key: 'cancelled', label: t.status.cancelled },
      { key: 'exonerated', label: t.status.exonerated },
    ],
    [t]
  )

  const filteredQuotas = useMemo(() => {
    let filtered = quotas

    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter)
    }
    if (searchInput.trim()) {
      const search = searchInput.toLowerCase()

      filtered = filtered.filter(
        q =>
          q.unit?.unitNumber?.toLowerCase().includes(search) ||
          q.paymentConcept?.name?.toLowerCase().includes(search) ||
          q.periodDescription?.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [quotas, statusFilter, searchInput])

  const columns: ITableColumn<TQuota>[] = useMemo(
    () => [
      { key: 'unit', label: t.table.unit },
      { key: 'concept', label: t.table.concept },
      { key: 'period', label: t.table.period },
      { key: 'amount', label: t.table.amount },
      { key: 'balance', label: t.table.balance },
      { key: 'status', label: t.table.status },
      { key: 'dueDate', label: t.table.dueDate },
    ],
    [t]
  )

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) setStatusFilter(key as TQuotaStatusFilter)
  }, [])

  const renderCell = useCallback(
    (quota: TQuota, columnKey: string) => {
      switch (columnKey) {
        case 'unit':
          return <span className="font-medium text-sm">{quota.unit?.unitNumber || '-'}</span>
        case 'concept':
          return (
            <span className="text-sm text-default-700">{quota.paymentConcept?.name || '-'}</span>
          )
        case 'period':
          return (
            <div className="flex items-center gap-1.5">
              <Calendar className="text-default-400" size={14} />
              <span className="text-sm text-default-600">
                {quota.periodDescription ||
                  `${quota.periodYear}${quota.periodMonth ? `/${String(quota.periodMonth).padStart(2, '0')}` : ''}`}
              </span>
            </div>
          )
        case 'amount':
          return <span className="text-sm font-medium">{formatAmount(quota.baseAmount)}</span>
        case 'balance':
          return (
            <span className="text-sm font-medium text-default-600">
              {formatAmount(quota.balance)}
            </span>
          )
        case 'status':
          return (
            <Chip
              color={STATUS_COLORS[quota.status as keyof typeof STATUS_COLORS] || 'default'}
              size="sm"
              variant="flat"
            >
              {t.status[quota.status as keyof typeof t.status] || quota.status}
            </Chip>
          )
        case 'dueDate':
          return <span className="text-sm text-default-600">{formatShortDate(quota.dueDate)}</span>
        default:
          return null
      }
    },
    [t]
  )

  if (quotas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
        <Receipt className="mb-4 text-default-300" size={48} />
        <Typography color="muted" variant="body1">
          {t.empty}
        </Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t.emptyDescription}
        </Typography>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t.filters.searchPlaceholder}
          startContent={<Search className="text-default-400" size={16} />}
          value={searchInput}
          onValueChange={setSearchInput}
        />
        <Select
          aria-label={t.filters.status}
          className="w-full sm:w-40"
          items={statusFilterItems}
          placeholder={t.filters.status}
          value={statusFilter}
          variant="bordered"
          onChange={handleStatusChange}
        />
      </div>

      {/* Mobile Cards */}
      <div className="block space-y-3 md:hidden">
        {filteredQuotas.map(quota => (
          <Card key={quota.id} className="w-full">
            <CardBody className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{quota.unit?.unitNumber || '-'}</p>
                  <p className="text-xs text-default-500">{quota.paymentConcept?.name || '-'}</p>
                </div>
                <Chip
                  color={STATUS_COLORS[quota.status as keyof typeof STATUS_COLORS] || 'default'}
                  size="sm"
                  variant="flat"
                >
                  {t.status[quota.status as keyof typeof t.status] || quota.status}
                </Chip>
              </div>
              <div className="flex items-center justify-between text-xs text-default-500">
                <span>{quota.periodDescription || `${quota.periodYear}/${quota.periodMonth}`}</span>
                <span>{formatShortDate(quota.dueDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{formatAmount(quota.baseAmount)}</span>
                <span className="text-xs text-default-500">
                  {t.table.balance}: {formatAmount(quota.balance)}
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table<TQuota>
          aria-label={t.title}
          columns={columns}
          mobileCards={false}
          renderCell={renderCell}
          rows={filteredQuotas}
        />
      </div>
    </div>
  )
}
