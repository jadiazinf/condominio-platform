'use client'

import { useState } from 'react'
import type { TPayment } from '@packages/domain'
import { usePaymentsByUnitPaginated } from '@packages/http-client/hooks'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Input } from '@/ui/components/input'
import { Select } from '@/ui/components/select'
import { Button } from '@/ui/components/button'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { X } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'
import { formatFullDate } from '@packages/utils/dates'

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

const paymentStatusColors: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'primary'> = {
  completed: 'success',
  pending: 'warning',
  pending_verification: 'primary',
  failed: 'danger',
  refunded: 'default',
  rejected: 'danger',
}

export function AllPaymentsModal({ isOpen, onClose, unitId, translations: t }: AllPaymentsModalProps) {
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
        return formatAmount(payment.amount)
      case 'method':
        return t.methods[payment.paymentMethod] || payment.paymentMethod
      case 'status':
        return (
          <Chip color={paymentStatusColors[payment.status] || 'default'} variant="flat" size="sm">
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
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{t.title}</Typography>
        </ModalHeader>
        <ModalBody className="pb-6">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[140px]">
              <Input
                type="date"
                label={t.filters.dateFrom}
                size="sm"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
              />
            </div>
            <div className="min-w-[140px]">
              <Input
                type="date"
                label={t.filters.dateTo}
                size="sm"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
              />
            </div>
            <div className="min-w-[150px]">
              <Select
                label={t.filters.status}
                size="sm"
                selectedKeys={status ? [status] : []}
                onChange={(key) => { setStatus(key ?? ''); setPage(1) }}
                items={statusOptions.map(o => ({ key: o.value, label: o.label }))}
              />
            </div>
            {hasFilters && (
              <Button size="sm" variant="light" onPress={handleClearFilters} startContent={<X size={14} />}>
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
            <Typography variant="body2" color="muted" className="py-8 text-center">
              {t.noResults}
            </Typography>
          ) : (
            <>
              <Table<TPaymentRow>
                aria-label={t.title}
                columns={columns}
                rows={payments}
                renderCell={renderCell}
                classNames={{
                  wrapper: 'shadow-none border-none p-0',
                  tr: 'hover:bg-default-50',
                }}
              />
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={setPage}
                    showLimitSelector={false}
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
