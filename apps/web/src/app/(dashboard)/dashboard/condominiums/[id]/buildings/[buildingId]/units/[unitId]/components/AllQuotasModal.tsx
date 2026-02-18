'use client'

import { useState } from 'react'
import type { TQuota } from '@packages/domain'
import { useQuotasByUnitPaginated } from '@packages/http-client/hooks'
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

interface AllQuotasModalProps {
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
      concept: string
      period: string
      amount: string
      paid: string
      balance: string
      status: string
    }
    statuses: Record<string, string>
    noResults: string
  }
}

const ITEMS_PER_PAGE = 10

type TQuotaRow = TQuota & { id: string }

const quotaStatusColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
  cancelled: 'default',
}

export function AllQuotasModal({ isOpen, onClose, unitId, translations: t }: AllQuotasModalProps) {
  const [page, setPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuotasByUnitPaginated({
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

  const quotas = data?.data ?? []
  const pagination = data?.pagination

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setStatus('')
    setPage(1)
  }

  const hasFilters = startDate || endDate || status

  const columns: ITableColumn<TQuotaRow>[] = [
    { key: 'concept', label: t.table.concept },
    { key: 'period', label: t.table.period },
    { key: 'amount', label: t.table.amount, align: 'end' },
    { key: 'paid', label: t.table.paid, align: 'end' },
    { key: 'balance', label: t.table.balance, align: 'end' },
    { key: 'status', label: t.table.status },
  ]

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const renderCell = (quota: TQuota, columnKey: string) => {
    switch (columnKey) {
      case 'concept':
        return quota.paymentConcept?.name || quota.periodDescription || '-'
      case 'period': {
        if (quota.periodMonth) {
          const monthName = new Date(quota.periodYear, quota.periodMonth - 1).toLocaleDateString('es-VE', { month: 'short' })
          return `${monthName} ${quota.periodYear}`
        }
        return quota.periodDescription || `${quota.periodYear}`
      }
      case 'amount':
        return formatCurrency(quota.baseAmount)
      case 'paid':
        return formatCurrency(quota.paidAmount)
      case 'balance':
        return (
          <span className={parseFloat(quota.balance) > 0 ? 'text-danger font-medium' : ''}>
            {formatCurrency(quota.balance)}
          </span>
        )
      case 'status':
        return (
          <Chip color={quotaStatusColors[quota.status] || 'default'} variant="flat" size="sm">
            {t.statuses[quota.status] || quota.status}
          </Chip>
        )
      default:
        return null
    }
  }

  const statusOptions = [
    { label: t.filters.allStatuses, value: '' },
    { label: t.statuses.pending || 'Pendiente', value: 'pending' },
    { label: t.statuses.paid || 'Pagado', value: 'paid' },
    { label: t.statuses.overdue || 'Vencido', value: 'overdue' },
    { label: t.statuses.cancelled || 'Cancelado', value: 'cancelled' },
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
          ) : quotas.length === 0 ? (
            <Typography variant="body2" color="muted" className="py-8 text-center">
              {t.noResults}
            </Typography>
          ) : (
            <>
              <Table<TQuotaRow>
                aria-label={t.title}
                columns={columns}
                rows={quotas}
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
