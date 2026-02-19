'use client'

import { useState, useMemo, useCallback } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { Input } from '@/ui/components/input'
import { CreditCard, Search } from 'lucide-react'
import type { TPayment } from '@packages/domain'
import { formatAmount } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'

type TPaymentStatusFilter = 'all' | 'pending' | 'pending_verification' | 'completed' | 'failed' | 'refunded' | 'rejected'

const STATUS_COLORS = {
  pending: 'warning',
  pending_verification: 'warning',
  completed: 'success',
  failed: 'danger',
  refunded: 'secondary',
  rejected: 'danger',
} as const

interface PaymentsTableProps {
  payments: TPayment[]
  translations: {
    title: string
    subtitle: string
    empty: string
    emptyDescription: string
    table: {
      paymentNumber: string
      unit: string
      amount: string
      method: string
      status: string
      date: string
    }
    status: {
      pending: string
      pending_verification: string
      completed: string
      failed: string
      refunded: string
      rejected: string
    }
    methods: {
      transfer: string
      cash: string
      card: string
      mobile_payment: string
      gateway: string
      other: string
    }
    filters: {
      all: string
      searchPlaceholder: string
      status: string
    }
  }
}

export function PaymentsTable({ payments, translations: t }: PaymentsTableProps) {
  const [statusFilter, setStatusFilter] = useState<TPaymentStatusFilter>('all')
  const [searchInput, setSearchInput] = useState('')

  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t.filters.all },
      { key: 'pending', label: t.status.pending },
      { key: 'pending_verification', label: t.status.pending_verification },
      { key: 'completed', label: t.status.completed },
      { key: 'failed', label: t.status.failed },
      { key: 'refunded', label: t.status.refunded },
      { key: 'rejected', label: t.status.rejected },
    ],
    [t]
  )

  const filteredPayments = useMemo(() => {
    let filtered = payments
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }
    if (searchInput.trim()) {
      const search = searchInput.toLowerCase()
      filtered = filtered.filter(
        p =>
          p.paymentNumber?.toLowerCase().includes(search) ||
          p.unit?.unitNumber?.toLowerCase().includes(search) ||
          p.receiptNumber?.toLowerCase().includes(search)
      )
    }
    return filtered
  }, [payments, statusFilter, searchInput])

  const columns: ITableColumn<TPayment>[] = useMemo(
    () => [
      { key: 'paymentNumber', label: t.table.paymentNumber },
      { key: 'unit', label: t.table.unit },
      { key: 'amount', label: t.table.amount },
      { key: 'method', label: t.table.method },
      { key: 'status', label: t.table.status },
      { key: 'date', label: t.table.date },
    ],
    [t]
  )

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) setStatusFilter(key as TPaymentStatusFilter)
  }, [])

  const renderCell = useCallback(
    (payment: TPayment, columnKey: string) => {
      switch (columnKey) {
        case 'paymentNumber':
          return (
            <span className="font-medium text-sm">
              {payment.paymentNumber || '-'}
            </span>
          )
        case 'unit':
          return (
            <span className="text-sm text-default-700">
              {payment.unit?.unitNumber || '-'}
            </span>
          )
        case 'amount':
          return (
            <span className="text-sm font-medium">
              {formatAmount(payment.amount)}
            </span>
          )
        case 'method':
          return (
            <span className="text-sm text-default-600">
              {t.methods[payment.paymentMethod as keyof typeof t.methods] || payment.paymentMethod}
            </span>
          )
        case 'status':
          return (
            <Chip
              color={STATUS_COLORS[payment.status as keyof typeof STATUS_COLORS] || 'default'}
              variant="flat"
              size="sm"
            >
              {t.status[payment.status as keyof typeof t.status] || payment.status}
            </Chip>
          )
        case 'date':
          return (
            <span className="text-sm text-default-600">
              {formatShortDate(payment.paymentDate)}
            </span>
          )
        default:
          return null
      }
    },
    [t]
  )

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
        <CreditCard className="mb-4 text-default-300" size={48} />
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
          placeholder={t.filters.status}
          className="w-full sm:w-40"
          items={statusFilterItems}
          value={statusFilter}
          onChange={handleStatusChange}
          variant="bordered"
        />
      </div>

      {/* Mobile Cards */}
      <div className="block space-y-3 md:hidden">
        {filteredPayments.map(payment => (
          <Card key={payment.id} className="w-full">
            <CardBody className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{payment.paymentNumber || '-'}</p>
                  <p className="text-xs text-default-500">{payment.unit?.unitNumber || '-'}</p>
                </div>
                <Chip
                  color={STATUS_COLORS[payment.status as keyof typeof STATUS_COLORS] || 'default'}
                  variant="flat"
                  size="sm"
                >
                  {t.status[payment.status as keyof typeof t.status] || payment.status}
                </Chip>
              </div>
              <div className="flex items-center justify-between text-xs text-default-500">
                <span>{t.methods[payment.paymentMethod as keyof typeof t.methods] || payment.paymentMethod}</span>
                <span>{formatShortDate(payment.paymentDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{formatAmount(payment.amount)}</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table<TPayment>
          aria-label={t.title}
          columns={columns}
          rows={filteredPayments}
          renderCell={renderCell}
        />
      </div>
    </div>
  )
}
