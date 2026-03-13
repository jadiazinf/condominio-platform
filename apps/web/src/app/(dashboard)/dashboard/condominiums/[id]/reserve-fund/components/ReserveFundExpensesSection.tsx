'use client'

import { useState, useMemo, useCallback } from 'react'
import { Input } from '@/ui/components/input'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Card, CardBody } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Receipt, Plus } from 'lucide-react'
import type { TExpense, TReserveFundExpensesQuery } from '@packages/domain'
import { useReserveFundExpensesPaginated, useActiveCurrencies } from '@packages/http-client/hooks'
import { CreateReserveFundExpenseModal } from './CreateReserveFundExpenseModal'
import { ExpenseDetailModal } from './ExpenseDetailModal'
import type { TExpensesTranslations } from './types'

interface ReserveFundExpensesSectionProps {
  condominiumId: string
  managementCompanyId: string
  translations: TExpensesTranslations
}

export function ReserveFundExpensesSection({
  condominiumId,
  managementCompanyId,
  translations: t,
}: ReserveFundExpensesSectionProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)

  const { data: currenciesData } = useActiveCurrencies()
  const currencies = currenciesData?.data ?? []

  const query: TReserveFundExpensesQuery = useMemo(
    () => ({
      page,
      limit,
      condominiumId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, limit, condominiumId, startDate, endDate]
  )

  const { data, isLoading } = useReserveFundExpensesPaginated({
    companyId: managementCompanyId,
    query,
    enabled: !!managementCompanyId && !!condominiumId,
  })

  const expenses = (data?.data ?? []) as TExpense[]
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value)
    setPage(1)
  }, [])

  const handleEndDateChange = useCallback((value: string) => {
    setEndDate(value)
    setPage(1)
  }, [])

  const columns: ITableColumn<TExpense>[] = useMemo(
    () => [
      { key: 'description', label: t.table.description },
      { key: 'amount', label: t.table.amount },
      { key: 'date', label: t.table.date },
      { key: 'vendor', label: t.table.vendor },
    ],
    [t]
  )

  const renderCell = useCallback(
    (expense: TExpense, columnKey: string) => {
      switch (columnKey) {
        case 'description':
          return <span className="text-sm font-medium">{expense.description || '-'}</span>
        case 'amount':
          return (
            <span className="text-sm font-medium">
              {parseFloat(expense.amount).toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          )
        case 'date':
          return expense.expenseDate ? (
            <span className="text-sm text-default-600">
              {new Date(expense.expenseDate).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          ) : (
            <span className="text-sm text-default-400">-</span>
          )
        case 'vendor':
          return <span className="text-sm text-default-600">{expense.vendorName || '-'}</span>
        default:
          return null
      }
    },
    []
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Typography variant="h4">{t.title}</Typography>
        <Button
          color="primary"
          startContent={<Plus size={18} />}
          onPress={() => setIsModalOpen(true)}
        >
          {t.addExpense}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
        <Input
          type="date"
          label={t.filters.startDate}
          value={startDate}
          onValueChange={handleStartDateChange}
          className="w-full sm:w-44"
          variant="bordered"
          isClearable
          onClear={() => handleStartDateChange('')}
        />
        <Input
          type="date"
          label={t.filters.endDate}
          value={endDate}
          onValueChange={handleEndDateChange}
          className="w-full sm:w-44"
          variant="bordered"
          isClearable
          onClear={() => handleEndDateChange('')}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
          <Receipt className="mb-4 text-default-300" size={40} />
          <Typography color="muted" variant="body1">
            {t.empty}
          </Typography>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="block space-y-3 md:hidden">
            {expenses.map(expense => (
              <Card
                key={expense.id}
                className="w-full cursor-pointer"
                isPressable
                onPress={() => setSelectedExpenseId(expense.id)}
              >
                <CardBody className="space-y-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{expense.description || '-'}</p>
                    <p className="text-xs text-default-500">{expense.vendorName || '-'}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {parseFloat(expense.amount).toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    {expense.expenseDate && (
                      <span className="text-xs text-default-400">
                        {new Date(expense.expenseDate).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table<TExpense>
              mobileCards={false}
              aria-label={t.title}
              columns={columns}
              rows={expenses}
              renderCell={renderCell}
              onRowClick={(expense) => setSelectedExpenseId(expense.id)}
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

      <CreateReserveFundExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        condominiumId={condominiumId}
        managementCompanyId={managementCompanyId}
        currencies={currencies}
        translations={t.form}
      />

      <ExpenseDetailModal
        isOpen={!!selectedExpenseId}
        onClose={() => setSelectedExpenseId(null)}
        expenseId={selectedExpenseId}
        managementCompanyId={managementCompanyId}
        currencies={currencies}
        translations={t.detail}
      />
    </div>
  )
}
