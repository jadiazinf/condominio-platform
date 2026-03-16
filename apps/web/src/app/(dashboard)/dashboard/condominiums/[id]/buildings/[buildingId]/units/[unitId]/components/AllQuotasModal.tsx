'use client'

import type { TQuota } from '@packages/domain'

import { useState } from 'react'
import { useQuotasByUnitPaginated } from '@packages/http-client/hooks'
import { X } from 'lucide-react'
import { formatAmount } from '@packages/utils/currency'

import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Input } from '@/ui/components/input'
import { Select } from '@/ui/components/select'
import { Button } from '@/ui/components/button'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'

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

const quotaStatusColors: Record<
  string,
  'success' | 'warning' | 'danger' | 'default' | 'secondary' | 'primary'
> = {
  paid: 'success',
  pending: 'warning',
  partial: 'primary',
  overdue: 'danger',
  cancelled: 'default',
  exonerated: 'secondary',
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

  const renderCell = (quota: TQuota, columnKey: string) => {
    switch (columnKey) {
      case 'concept':
        return quota.paymentConcept?.name || quota.periodDescription || '-'
      case 'period': {
        if (quota.periodMonth) {
          const monthName = new Date(quota.periodYear, quota.periodMonth - 1).toLocaleDateString(
            'es-VE',
            { month: 'short' }
          )

          return `${monthName} ${quota.periodYear}`
        }

        return quota.periodDescription || `${quota.periodYear}`
      }
      case 'amount':
        return formatAmount(quota.baseAmount)
      case 'paid':
        return formatAmount(quota.paidAmount)
      case 'balance':
        return (
          <span className={parseFloat(quota.balance) > 0 ? 'text-danger font-medium' : ''}>
            {formatAmount(quota.balance)}
          </span>
        )
      case 'status':
        return (
          <Chip color={quotaStatusColors[quota.status] || 'default'} size="sm" variant="flat">
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
    { label: t.statuses.partial || 'Parcial', value: 'partial' },
    { label: t.statuses.paid || 'Pagado', value: 'paid' },
    { label: t.statuses.overdue || 'Vencido', value: 'overdue' },
    { label: t.statuses.cancelled || 'Cancelado', value: 'cancelled' },
    { label: t.statuses.exonerated || 'Exonerada', value: 'exonerated' },
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
              <Input
                label={t.filters.dateFrom}
                size="sm"
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="min-w-[140px]">
              <Input
                label={t.filters.dateTo}
                size="sm"
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value)
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
          ) : quotas.length === 0 ? (
            <Typography className="py-8 text-center" color="muted" variant="body2">
              {t.noResults}
            </Typography>
          ) : (
            <>
              <Table<TQuotaRow>
                aria-label={t.title}
                classNames={{
                  wrapper: 'shadow-none border-none p-0',
                  tr: 'hover:bg-default-50',
                }}
                columns={columns}
                renderCell={renderCell}
                rows={quotas}
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
