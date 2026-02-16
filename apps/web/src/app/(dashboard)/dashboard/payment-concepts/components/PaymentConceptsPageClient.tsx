'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { FileText, Plus, Search, X } from 'lucide-react'
import { useTranslation } from '@/contexts'
import type { TPaymentConcept, TPaymentConceptsQuery } from '@packages/domain'

import {
  useMyCompanyPaymentConceptsPaginated,
  useCompanyCondominiumsPaginated,
} from '@packages/http-client'

const TYPE_COLORS = {
  maintenance: 'primary',
  condominium_fee: 'secondary',
  extraordinary: 'warning',
  fine: 'danger',
  other: 'default',
} as const

type TConceptRow = TPaymentConcept & { condominiumName: string | null }
type TTypeFilter = 'all' | 'maintenance' | 'condominium_fee' | 'extraordinary' | 'fine' | 'other'
type TStatusFilter = 'all' | 'active' | 'inactive'

interface PaymentConceptsPageClientProps {
  managementCompanyId: string
}

export function PaymentConceptsPageClient({ managementCompanyId }: PaymentConceptsPageClientProps) {
  const router = useRouter()
  const { t } = useTranslation()

  // Filter state
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TTypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')
  const [condominiumFilter, setCondominiumFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch condominiums for filter dropdown
  const { data: condominiumsData } = useCompanyCondominiumsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 100 },
    enabled: !!managementCompanyId,
  })

  const condominiums = condominiumsData?.data ?? []

  // Build query for API
  const query: TPaymentConceptsQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      conceptType: typeFilter === 'all' ? undefined : typeFilter,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      condominiumId: condominiumFilter === 'all' ? undefined : condominiumFilter,
    }),
    [page, limit, debouncedSearch, typeFilter, statusFilter, condominiumFilter]
  )

  // Type filter items
  const typeFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.paymentConcepts.allTypes') },
      { key: 'maintenance', label: t('admin.paymentConcepts.types.maintenance') },
      { key: 'condominium_fee', label: t('admin.paymentConcepts.types.condominiumFee') },
      { key: 'extraordinary', label: t('admin.paymentConcepts.types.extraordinary') },
      { key: 'fine', label: t('admin.paymentConcepts.types.fine') },
      { key: 'other', label: t('admin.paymentConcepts.types.other') },
    ],
    [t]
  )

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.paymentConcepts.allStatuses') },
      { key: 'active', label: t('admin.paymentConcepts.active') },
      { key: 'inactive', label: t('admin.paymentConcepts.inactive') },
    ],
    [t]
  )

  // Condominium filter items
  const condominiumFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.paymentConcepts.allCondominiums') },
      ...condominiums.map(c => ({ key: c.id, label: c.name })),
    ],
    [condominiums, t]
  )

  // Table columns
  const tableColumns: ITableColumn<TConceptRow>[] = useMemo(
    () => [
      { key: 'name', label: t('admin.paymentConcepts.columns.name') },
      { key: 'condominium', label: t('admin.paymentConcepts.columns.condominium') },
      { key: 'type', label: t('admin.paymentConcepts.columns.type') },
      { key: 'recurring', label: t('admin.paymentConcepts.columns.recurring') },
      { key: 'status', label: t('admin.paymentConcepts.columns.status') },
    ],
    [t]
  )

  // Fetch data
  const { data, isLoading, error, refetch } = useMyCompanyPaymentConceptsPaginated({
    companyId: managementCompanyId,
    query,
    enabled: !!managementCompanyId,
  })

  const concepts = (data?.data ?? []) as TConceptRow[]
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

  const handleTypeChange = useCallback((key: string | null) => {
    if (key) {
      setTypeFilter(key as TTypeFilter)
      setPage(1)
    }
  }, [])

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) {
      setStatusFilter(key as TStatusFilter)
      setPage(1)
    }
  }, [])

  const handleCondominiumChange = useCallback((key: string | null) => {
    if (key) {
      setCondominiumFilter(key)
      setPage(1)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setDebouncedSearch('')
    setTypeFilter('all')
    setStatusFilter('active')
    setCondominiumFilter('all')
    setPage(1)
  }, [])

  const handleRowClick = useCallback(
    (concept: TConceptRow) => {
      router.push(`/dashboard/payment-concepts/${concept.id}`)
    },
    [router]
  )

  const getTypeLabel = useCallback(
    (conceptType: string) => {
      const labels: Record<string, string> = {
        maintenance: t('admin.paymentConcepts.types.maintenance'),
        condominium_fee: t('admin.paymentConcepts.types.condominiumFee'),
        extraordinary: t('admin.paymentConcepts.types.extraordinary'),
        fine: t('admin.paymentConcepts.types.fine'),
        other: t('admin.paymentConcepts.types.other'),
      }
      return labels[conceptType] || conceptType
    },
    [t]
  )

  const getRecurrenceLabel = useCallback(
    (period: string) => {
      const labels: Record<string, string> = {
        monthly: t('admin.paymentConcepts.recurrence.monthly'),
        quarterly: t('admin.paymentConcepts.recurrence.quarterly'),
        yearly: t('admin.paymentConcepts.recurrence.yearly'),
      }
      return labels[period] || period
    },
    [t]
  )

  const renderCell = useCallback(
    (concept: TConceptRow, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{concept.name}</span>
              {concept.description && (
                <span className="text-xs text-default-500 line-clamp-1">{concept.description}</span>
              )}
            </div>
          )
        case 'condominium':
          return (
            <span className="text-sm text-default-600">
              {concept.condominiumName || '-'}
            </span>
          )
        case 'type':
          return (
            <Chip
              color={TYPE_COLORS[concept.conceptType as keyof typeof TYPE_COLORS] || 'default'}
              variant="flat"
              size="sm"
            >
              {getTypeLabel(concept.conceptType)}
            </Chip>
          )
        case 'recurring':
          return (
            <div className="flex items-center gap-2">
              <Chip
                color={concept.isRecurring ? 'success' : 'default'}
                variant="flat"
                size="sm"
              >
                {concept.isRecurring
                  ? t('admin.paymentConcepts.recurringYes')
                  : t('admin.paymentConcepts.recurringNo')}
              </Chip>
              {concept.isRecurring && concept.recurrencePeriod && (
                <span className="text-xs text-default-500">
                  {getRecurrenceLabel(concept.recurrencePeriod)}
                </span>
              )}
            </div>
          )
        case 'status':
          return (
            <Chip
              color={concept.isActive ? 'success' : 'default'}
              variant="dot"
            >
              {concept.isActive
                ? t('admin.paymentConcepts.active')
                : t('admin.paymentConcepts.inactive')}
            </Chip>
          )
        default:
          return null
      }
    },
    [t, getTypeLabel, getRecurrenceLabel]
  )

  const hasActiveFilters =
    searchInput ||
    typeFilter !== 'all' ||
    statusFilter !== 'active' ||
    condominiumFilter !== 'all'

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('admin.paymentConcepts.error')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('admin.paymentConcepts.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">{t('admin.paymentConcepts.title')}</Typography>
          <Typography color="muted" variant="body2" className="mt-1">
            {t('admin.paymentConcepts.subtitle')}
          </Typography>
        </div>
        <Button color="primary" startContent={<Plus size={16} />} isDisabled>
          {t('admin.paymentConcepts.addConcept')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t('admin.paymentConcepts.search')}
          startContent={<Search className="text-default-400" size={16} />}
          value={searchInput}
          onValueChange={handleSearchChange}
        />
        <Select
          aria-label={t('admin.paymentConcepts.filterType')}
          className="w-full sm:w-52"
          items={typeFilterItems}
          value={typeFilter}
          onChange={handleTypeChange}
          variant="bordered"
        />
        <Select
          aria-label={t('admin.paymentConcepts.filterStatus')}
          className="w-full sm:w-40"
          items={statusFilterItems}
          value={statusFilter}
          onChange={handleStatusChange}
          variant="bordered"
        />
        {condominiums.length > 0 && (
          <Select
            aria-label={t('admin.paymentConcepts.filterCondominium')}
            className="w-full sm:w-56"
            items={condominiumFilterItems}
            value={condominiumFilter}
            onChange={handleCondominiumChange}
            variant="bordered"
          />
        )}
        {hasActiveFilters && (
          <Button startContent={<X size={14} />} variant="flat" onPress={handleClearFilters}>
            {t('admin.paymentConcepts.clear')}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : concepts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <FileText className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {hasActiveFilters
              ? t('admin.paymentConcepts.noResults')
              : t('admin.paymentConcepts.noConcepts')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {hasActiveFilters
              ? t('admin.paymentConcepts.noResultsHint')
              : t('admin.paymentConcepts.noConceptsHint')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TConceptRow>
            aria-label={t('admin.paymentConcepts.title')}
            columns={tableColumns}
            rows={concepts}
            renderCell={renderCell}
            onRowClick={handleRowClick}
            classNames={{
              tr: 'cursor-pointer hover:bg-default-100 transition-colors',
            }}
          />

          {/* Pagination */}
          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={[10, 20, 50]}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onLimitChange={(newLimit) => {
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
