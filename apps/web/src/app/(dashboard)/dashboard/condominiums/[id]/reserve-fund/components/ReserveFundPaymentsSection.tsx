'use client'

import type { TPayment, TReserveFundPaymentsQuery } from '@packages/domain'
import type { TPaymentsTranslations } from './types'

import { useState, useMemo, useCallback } from 'react'
import { CreditCard } from 'lucide-react'
import {
  useReserveFundPaymentsPaginated,
  useCondominiumUnits,
  useMyCompanyPaymentConceptsPaginated,
} from '@packages/http-client/hooks'

import { DatePicker } from '@/ui/components/date-picker'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'danger' | 'secondary' | 'default'> = {
  pending: 'warning',
  pending_verification: 'warning',
  completed: 'success',
  failed: 'danger',
  refunded: 'secondary',
  rejected: 'danger',
}

interface ReserveFundPaymentsSectionProps {
  condominiumId: string
  managementCompanyId: string
  translations: TPaymentsTranslations
}

export function ReserveFundPaymentsSection({
  condominiumId,
  managementCompanyId,
  translations: t,
}: ReserveFundPaymentsSectionProps) {
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [conceptFilter, setConceptFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Fetch units for the filter dropdown
  const { data: unitsData } = useCondominiumUnits({
    condominiumId,
    managementCompanyId,
    enabled: !!condominiumId,
  })

  // Fetch active reserve_fund concepts for the filter dropdown
  const { data: conceptsData } = useMyCompanyPaymentConceptsPaginated({
    companyId: managementCompanyId,
    query: {
      conceptType: 'reserve_fund',
      condominiumId,
      isActive: true,
      limit: 100,
    },
    enabled: !!managementCompanyId,
  })

  const units = unitsData?.data ?? []
  const concepts = conceptsData?.data ?? []

  const unitFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t.filters.allUnits },
      ...units
        .map(u => ({ key: u.id, label: u.unitNumber }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
    ],
    [units, t]
  )

  const conceptFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t.filters.allConcepts },
      ...concepts
        .map(c => ({ key: c.id, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [concepts, t]
  )

  const query: TReserveFundPaymentsQuery = useMemo(
    () => ({
      page,
      limit,
      condominiumId,
      unitId: unitFilter === 'all' ? undefined : unitFilter,
      conceptId: conceptFilter === 'all' ? undefined : conceptFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, limit, condominiumId, unitFilter, conceptFilter, startDate, endDate]
  )

  const { data, isLoading } = useReserveFundPaymentsPaginated({
    companyId: managementCompanyId,
    query,
    enabled: !!managementCompanyId && !!condominiumId,
  })

  const payments = (data?.data ?? []) as TPayment[]
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  const handleUnitChange = useCallback((key: string | null) => {
    if (key) {
      setUnitFilter(key)
      setPage(1)
    }
  }, [])

  const handleConceptChange = useCallback((key: string | null) => {
    if (key) {
      setConceptFilter(key)
      setPage(1)
    }
  }, [])

  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value)
    setPage(1)
  }, [])

  const handleEndDateChange = useCallback((value: string) => {
    setEndDate(value)
    setPage(1)
  }, [])

  const columns: ITableColumn<TPayment>[] = useMemo(
    () => [
      { key: 'paymentNumber', label: t.table.paymentNumber },
      { key: 'unit', label: t.table.unit },
      { key: 'amount', label: t.table.amount },
      { key: 'date', label: t.table.date },
      { key: 'status', label: t.table.status },
      { key: 'method', label: t.table.method },
    ],
    [t]
  )

  const renderCell = useCallback(
    (payment: TPayment, columnKey: string) => {
      switch (columnKey) {
        case 'paymentNumber':
          return <span className="font-medium text-sm">{payment.paymentNumber || '-'}</span>
        case 'unit': {
          const unit = units.find(u => u.id === payment.unitId)

          return <span className="text-sm text-default-600">{unit?.unitNumber ?? '-'}</span>
        }
        case 'amount':
          return (
            <span className="text-sm font-medium">
              {parseFloat(payment.amount).toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          )
        case 'date':
          return payment.paymentDate ? (
            <span className="text-sm text-default-600">
              {new Date(payment.paymentDate).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          ) : (
            <span className="text-sm text-default-400">-</span>
          )
        case 'status':
          return (
            <Chip color={STATUS_COLORS[payment.status] ?? 'default'} size="sm" variant="flat">
              {t.status[payment.status] ?? payment.status}
            </Chip>
          )
        case 'method':
          return (
            <span className="text-sm text-default-600">
              {t.methods[payment.paymentMethod] ?? payment.paymentMethod ?? '-'}
            </span>
          )
        default:
          return null
      }
    },
    [t, units]
  )

  return (
    <div className="space-y-4">
      <Typography variant="h4">{t.title}</Typography>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
        <Select
          className="w-full sm:w-48"
          items={unitFilterItems}
          label={t.filters.unit}
          value={unitFilter}
          variant="bordered"
          onChange={handleUnitChange}
        />
        <Select
          className="w-full sm:w-56"
          items={conceptFilterItems}
          label={t.filters.concept}
          value={conceptFilter}
          variant="bordered"
          onChange={handleConceptChange}
        />
        <DatePicker
          className="w-full sm:w-44"
          label={t.filters.startDate}
          value={startDate}
          onChange={handleStartDateChange}
        />
        <DatePicker
          className="w-full sm:w-44"
          label={t.filters.endDate}
          value={endDate}
          onChange={handleEndDateChange}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
          <CreditCard className="mb-4 text-default-300" size={40} />
          <Typography color="muted" variant="body1">
            {t.empty}
          </Typography>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="block space-y-3 md:hidden">
            {payments.map(payment => {
              const unit = units.find(u => u.id === payment.unitId)

              return (
                <Card key={payment.id} className="w-full">
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{payment.paymentNumber || '-'}</p>
                        <p className="text-xs text-default-500">{unit?.unitNumber ?? '-'}</p>
                      </div>
                      <Chip
                        color={STATUS_COLORS[payment.status] ?? 'default'}
                        size="sm"
                        variant="flat"
                      >
                        {t.status[payment.status] ?? payment.status}
                      </Chip>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {parseFloat(payment.amount).toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      {payment.paymentDate && (
                        <span className="text-xs text-default-400">
                          {new Date(payment.paymentDate).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table<TPayment>
              aria-label={t.title}
              columns={columns}
              mobileCards={false}
              renderCell={renderCell}
              rows={payments}
            />
          </div>

          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={[10, 20, 50]}
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
