'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { Search, FileText } from 'lucide-react'
import type { TPaymentConcept, TPaymentConceptsQuery } from '@packages/domain'
import { useMyCompanyPaymentConceptsPaginated } from '@packages/http-client/hooks'
import type { TConceptsTranslations } from './types'

type TStatusFilter = 'all' | 'active' | 'inactive'

interface ReserveFundConceptsSectionProps {
  condominiumId: string
  managementCompanyId: string
  translations: TConceptsTranslations
}

function formatMonthYear(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const monthYear = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return monthYear.charAt(0).toUpperCase() + monthYear.slice(1)
}

export function ReserveFundConceptsSection({
  condominiumId,
  managementCompanyId,
  translations: t,
}: ReserveFundConceptsSectionProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const query: TPaymentConceptsQuery = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      conceptType: 'reserve_fund',
      condominiumId,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
    [page, limit, search, statusFilter, condominiumId]
  )

  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t.filters.allStatuses },
      { key: 'active', label: t.filters.active },
      { key: 'inactive', label: t.filters.inactive },
    ],
    [t]
  )

  const { data, isLoading } = useMyCompanyPaymentConceptsPaginated({
    companyId: managementCompanyId,
    query,
    enabled: !!managementCompanyId,
  })

  const concepts = (data?.data ?? []) as TPaymentConcept[]
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) { setStatusFilter(key as TStatusFilter); setPage(1) }
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value); setPage(1)
  }, [])

  const handleRowClick = useCallback((concept: TPaymentConcept) => {
    router.push(`/dashboard/condominiums/${condominiumId}/payment-concepts/${concept.id}`)
  }, [condominiumId, router])

  const columns: ITableColumn<TPaymentConcept>[] = useMemo(
    () => [
      { key: 'name', label: t.table.name },
      { key: 'recurring', label: t.table.recurring },
      { key: 'recurrence', label: t.table.recurrence },
      { key: 'createdAt', label: t.table.createdAt },
      { key: 'status', label: t.table.status },
    ],
    [t]
  )

  const renderCell = useCallback(
    (concept: TPaymentConcept, columnKey: string) => {
      switch (columnKey) {
        case 'name': {
          const monthYear = formatMonthYear(concept.createdAt)
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">
                {concept.name}{monthYear ? ` — ${monthYear}` : ''}
              </span>
              {concept.description && (
                <span className="text-xs text-default-500 line-clamp-1">{concept.description}</span>
              )}
            </div>
          )
        }
        case 'recurring':
          return (
            <Chip color={concept.isRecurring ? 'success' : 'default'} variant="flat" size="sm">
              {concept.isRecurring ? t.yes : t.no}
            </Chip>
          )
        case 'recurrence':
          return concept.recurrencePeriod ? (
            <span className="text-sm text-default-600">
              {t.recurrence[concept.recurrencePeriod as keyof typeof t.recurrence] || concept.recurrencePeriod}
            </span>
          ) : (
            <span className="text-sm text-default-400">-</span>
          )
        case 'createdAt':
          return concept.createdAt ? (
            <span className="text-sm text-default-600">
              {new Date(concept.createdAt).toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          ) : (
            <span className="text-sm text-default-400">-</span>
          )
        case 'status':
          return (
            <Chip color={concept.isActive ? 'success' : 'default'} variant="flat" size="sm">
              {concept.isActive ? t.status.active : t.status.inactive}
            </Chip>
          )
        default:
          return null
      }
    },
    [t]
  )

  return (
    <div className="space-y-4">
      <Typography variant="h4">{t.title}</Typography>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          placeholder={t.filters.searchPlaceholder}
          value={search}
          onValueChange={handleSearchChange}
          startContent={<Search size={16} className="text-default-400" />}
          className="w-full sm:w-64"
          variant="bordered"
          isClearable
          onClear={() => handleSearchChange('')}
        />
        <Select
          aria-label={t.table.status}
          className="w-full sm:w-36"
          items={statusFilterItems}
          value={statusFilter}
          onChange={handleStatusChange}
          variant="bordered"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : concepts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
          <FileText className="mb-4 text-default-300" size={40} />
          <Typography color="muted" variant="body1">
            {search ? t.noResults : t.empty}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {search ? t.noResultsHint : t.emptyDescription}
          </Typography>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="block space-y-3 md:hidden">
            {concepts.map(concept => {
              const monthYear = formatMonthYear(concept.createdAt)
              return (
                <Card
                  key={concept.id}
                  className="w-full cursor-pointer hover:bg-default-100 transition-colors"
                  isPressable
                  onPress={() => handleRowClick(concept)}
                >
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm">
                        {concept.name}{monthYear ? ` — ${monthYear}` : ''}
                      </p>
                      <Chip color={concept.isActive ? 'success' : 'default'} variant="flat" size="sm">
                        {concept.isActive ? t.status.active : t.status.inactive}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-2">
                      {concept.isRecurring && concept.recurrencePeriod && (
                        <span className="text-xs text-default-500">
                          {t.recurrence[concept.recurrencePeriod as keyof typeof t.recurrence]}
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
            <Table<TPaymentConcept>
              mobileCards={false}
              aria-label={t.title}
              columns={columns}
              rows={concepts}
              renderCell={renderCell}
              onRowClick={handleRowClick}
              classNames={{ tr: 'cursor-pointer hover:bg-default-100 transition-colors' }}
            />
          </div>

          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={[10, 20, 50]}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onLimitChange={newLimit => { setLimit(newLimit); setPage(1) }}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
