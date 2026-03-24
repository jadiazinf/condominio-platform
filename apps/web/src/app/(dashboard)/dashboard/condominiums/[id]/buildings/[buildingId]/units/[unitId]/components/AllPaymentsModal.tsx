'use client'

import type { TPayment } from '@packages/domain'

import { useState } from 'react'
import { usePaymentsByUnitPaginated } from '@packages/http-client/hooks'
import { X } from 'lucide-react'
import { formatFullDate } from '@packages/utils/dates'

import { ConvertedAmount } from '@/ui/components/currency/ConvertedAmount'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { DatePicker } from '@/ui/components/date-picker'
import { Select } from '@/ui/components/select'
import { Button } from '@/ui/components/button'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'

interface AllPaymentsModalProps {
  isOpen: boolean
  onClose: () => void
  unitId: string
  translations: {
    title: string
    filters: {
      dateFrom: string
      dateTo: string
      status: string
      allStatuses: string
      clear: string
    }
    table: {
      number: string
      date: string
      amount: string
      method: string
      status: string
    }
    statuses: Record<string, string>
    methods: Record<string, string>
    noResults: string
  }
}

const ITEMS_PER_PAGE = 10

type TPaymentRow = TPayment & { id: string }

const paymentStatusColors: Record<
  string,
  'success' | 'warning' | 'danger' | 'default' | 'primary'
> = {
  completed: 'success',
  pending: 'warning',
  pending_verification: 'primary',
  failed: 'danger',
  refunded: 'default',
  rejected: 'danger',
}

export function AllPaymentsModal({
  isOpen,
  onClose,
  unitId,
  translations: t,
}: AllPaymentsModalProps) {
  const [page, setPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = usePaymentsByUnitPaginated({
    query: {
      unitId,
      page,
      limit: ITEMS_PER_PAGE,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
    },
    enabled: isOpen,
  })

  const payments = data?.data ?? []
  const pagination = data?.pagination

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setStatus('')
    setPage(1)
  }

  const hasFilters = startDate || endDate || status

  const columns: ITableColumn<TPaymentRow>[] = [
    { key: 'number', label: t.table.number },
    { key: 'date', label: t.table.date },
    { key: 'amount', label: t.table.amount, align: 'end' },
    { key: 'method', label: t.table.method },
    { key: 'status', label: t.table.status },
  ]

  const renderCell = (payment: TPayment, columnKey: string) => {
    switch (columnKey) {
      case 'number':
        return payment.paymentNumber || '-'
      case 'date':
        return formatFullDate(payment.paymentDate)
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
        return t.methods[payment.paymentMethod] || payment.paymentMethod
      case 'status':
        return (
          <Chip color={paymentStatusColors[payment.status] || 'default'} size="sm" variant="flat">
            {t.statuses[payment.status] || payment.status}
          </Chip>
        )
      default:
        return null
    }
  }

  const statusOptions = [
    { label: t.filters.allStatuses, value: '' },
    { label: t.statuses.pending || 'Pendiente', value: 'pending' },
    { label: t.statuses.pending_verification || 'Por verificar', value: 'pending_verification' },
    { label: t.statuses.completed || 'Completado', value: 'completed' },
    { label: t.statuses.failed || 'Fallido', value: 'failed' },
    { label: t.statuses.refunded || 'Reembolsado', value: 'refunded' },
    { label: t.statuses.rejected || 'Rechazado', value: 'rejected' },
  ]

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="4xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{t.title}</Typography>
        </ModalHeader>
        <ModalBody className="pb-6">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[140px]">
              <DatePicker
                label={t.filters.dateFrom}
                value={startDate}
                onChange={v => {
                  setStartDate(v)
                  setPage(1)
                }}
              />
            </div>
            <div className="min-w-[140px]">
              <DatePicker
                label={t.filters.dateTo}
                value={endDate}
                onChange={v => {
                  setEndDate(v)
                  setPage(1)
                }}
              />
            </div>
            <div className="min-w-[150px]">
              <Select
                items={statusOptions.map(o => ({ key: o.value, label: o.label }))}
                label={t.filters.status}
                selectedKeys={status ? [status] : []}
                size="sm"
                onChange={key => {
                  setStatus(key ?? '')
                  setPage(1)
                }}
              />
            </div>
            {hasFilters && (
              <Button
                size="sm"
                startContent={<X size={14} />}
                variant="light"
                onPress={handleClearFilters}
              >
                {t.filters.clear}
              </Button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : payments.length === 0 ? (
            <Typography className="py-8 text-center" color="muted" variant="body2">
              {t.noResults}
            </Typography>
          ) : (
            <>
              <Table<TPaymentRow>
                aria-label={t.title}
                classNames={{
                  wrapper: 'shadow-none border-none p-0',
                  tr: 'hover:bg-default-50',
                }}
                columns={columns}
                renderCell={renderCell}
                rows={payments}
              />
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    limit={pagination.limit}
                    page={pagination.page}
                    showLimitSelector={false}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
