'use client'

import type { TPaymentConcept, TPaymentConceptsQuery } from '@packages/domain'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Search, FileText, FilePen } from 'lucide-react'
import {
  useMyCompanyPaymentConceptsPaginated,
  useWizardDraft,
  useDeleteWizardDraft,
  wizardDraftKeys,
} from '@packages/http-client/hooks'
import { useQueryClient } from '@packages/http-client'

import { PaymentConceptsTable } from './PaymentConceptsTable'

import { useTranslation } from '@/contexts'
import { useDebouncedValue } from '@/hooks'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'

type TTypeFilter =
  | 'all'
  | 'maintenance'
  | 'condominium_fee'
  | 'extraordinary'
  | 'fine'
  | 'reserve_fund'
  | 'other'
type TStatusFilter = 'all' | 'active' | 'inactive'

interface PaymentConceptsPageClientProps {
  condominiumId: string
  managementCompanyId: string
  translations: {
    title: string
    subtitle: string
    empty: string
    emptyDescription: string
    addConcept: string
    table: {
      name: string
      type: string
      recurring: string
      recurrence: string
      status: string
      createdAt: string
    }
    types: {
      maintenance: string
      condominium_fee: string
      extraordinary: string
      fine: string
      reserve_fund: string
      other: string
    }
    recurrence: {
      monthly: string
      quarterly: string
      yearly: string
    }
    yes: string
    no: string
    status: {
      active: string
      inactive: string
    }
    filters: {
      allTypes: string
      allStatuses: string
      active: string
      inactive: string
      searchPlaceholder: string
    }
    noResults: string
    noResultsHint: string
  }
}

export function PaymentConceptsPageClient({
  condominiumId,
  managementCompanyId,
  translations: t,
}: PaymentConceptsPageClientProps) {
  const router = useRouter()
  const { t: tr } = useTranslation()
  const queryClient = useQueryClient()
  const draftW = 'admin.condominiums.detail.paymentConcepts.wizard'

  // Check for pending draft (draftResponse is null when no draft, object with .data when exists)
  const { data: draftResponse } = useWizardDraft('payment_concept', condominiumId, {
    enabled: !!condominiumId,
  })
  const deleteDraftMutation = useDeleteWizardDraft('payment_concept', condominiumId)
  const hasPendingDraft = !!draftResponse?.data

  const handleDiscardDraft = useCallback(() => {
    // Optimistically remove draft from cache so banner disappears immediately
    queryClient.setQueryData(wizardDraftKeys.detail('payment_concept', condominiumId), null)
    deleteDraftMutation.mutate()
  }, [queryClient, condominiumId, deleteDraftMutation])

  // Filter state
  const [typeFilter, setTypeFilter] = useState<TTypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const isFirstRender = useRef(true)

  // Reset page when debounced search changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false

      return
    }
    setPage(1)
  }, [debouncedSearch])

  // Build query for API
  const query: TPaymentConceptsQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      conceptType: typeFilter === 'all' ? undefined : typeFilter,
      condominiumId,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
    [page, limit, debouncedSearch, typeFilter, statusFilter, condominiumId]
  )

  // Type filter items
  const typeFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t.filters.allTypes },
      { key: 'maintenance', label: t.types.maintenance },
      { key: 'condominium_fee', label: t.types.condominium_fee },
      { key: 'extraordinary', label: t.types.extraordinary },
      { key: 'fine', label: t.types.fine },
      { key: 'reserve_fund', label: t.types.reserve_fund },
      { key: 'other', label: t.types.other },
    ],
    [t]
  )

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t.filters.allStatuses },
      { key: 'active', label: t.filters.active },
      { key: 'inactive', label: t.filters.inactive },
    ],
    [t]
  )

  // Fetch data
  const { data, isLoading, error, refetch } = useMyCompanyPaymentConceptsPaginated({
    companyId: managementCompanyId,
    query,
    enabled: !!managementCompanyId,
  })

  const paymentConcepts = (data?.data ?? []) as TPaymentConcept[]
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  // Handlers
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

  const handleClearFilters = useCallback(() => {
    setTypeFilter('all')
    setStatusFilter('active')
    setSearchInput('')
    setPage(1)
  }, [])

  const handleRowClick = useCallback(
    (concept: TPaymentConcept) => {
      router.push(`/dashboard/condominiums/${condominiumId}/payment-concepts/${concept.id}`)
    },
    [condominiumId, router]
  )

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'active' || searchInput !== ''

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h3">{t.title}</Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {t.subtitle}
            </Typography>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
          <Typography color="danger" variant="body1">
            Error al cargar los conceptos
          </Typography>
          <Button className="mt-4" color="primary" onPress={() => refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">{t.title}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t.subtitle}
          </Typography>
        </div>
        <Button
          color="primary"
          href={`/dashboard/condominiums/${condominiumId}/payment-concepts/create`}
          startContent={<Plus size={16} />}
        >
          {t.addConcept}
        </Button>
      </div>

      {/* Pending draft banner */}
      {hasPendingDraft && (
        <div className="flex items-center justify-between rounded-lg border border-warning-200 bg-warning-50 p-4">
          <div className="flex items-center gap-3">
            <FilePen className="text-warning-600" size={20} />
            <Typography color="default" variant="body2">
              {tr(`${draftW}.pendingDraft`)}
            </Typography>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={handleDiscardDraft}>
              {tr(`${draftW}.discardDraft`)}
            </Button>
            <Button
              color="primary"
              href={`/dashboard/condominiums/${condominiumId}/payment-concepts/create`}
              size="sm"
            >
              {tr(`${draftW}.continueDraft`)}
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <Input
          isClearable
          className="w-full sm:w-64"
          placeholder={t.filters.searchPlaceholder}
          startContent={<Search className="text-default-400" size={16} />}
          value={searchInput}
          variant="bordered"
          onClear={() => setSearchInput('')}
          onValueChange={setSearchInput}
        />
        <Select
          aria-label={t.table.type}
          className="w-full sm:w-44"
          items={typeFilterItems}
          value={typeFilter}
          variant="bordered"
          onChange={handleTypeChange}
        />
        <Select
          aria-label={t.table.status}
          className="w-full sm:w-36"
          items={statusFilterItems}
          value={statusFilter}
          variant="bordered"
          onChange={handleStatusChange}
        />
        {hasActiveFilters && (
          <Button startContent={<X size={14} />} variant="flat" onPress={handleClearFilters}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : paymentConcepts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <FileText className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {hasActiveFilters ? t.noResults : t.empty}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {hasActiveFilters ? t.noResultsHint : t.emptyDescription}
          </Typography>
        </div>
      ) : (
        <>
          <PaymentConceptsTable
            paymentConcepts={paymentConcepts}
            translations={t}
            onRowClick={handleRowClick}
          />

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
