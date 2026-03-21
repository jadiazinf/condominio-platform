'use client'

import type { TPaymentConcept, TPaymentConceptsQuery, TPaginationMeta } from '@packages/domain'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, X, Search, FileText, FilePen } from 'lucide-react'
import { useWizardDraft, useDeleteWizardDraft, wizardDraftKeys } from '@packages/http-client/hooks'
import { useQueryClient } from '@packages/http-client'

import { PaymentConceptsTable } from './PaymentConceptsTable'

import { useTranslation } from '@/contexts'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
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
  paymentConcepts: TPaymentConcept[]
  pagination: TPaginationMeta
  initialQuery: TPaymentConceptsQuery
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
  paymentConcepts,
  pagination,
  initialQuery,
  translations: t,
}: PaymentConceptsPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t: tr } = useTranslation()
  const queryClient = useQueryClient()
  const draftW = 'admin.condominiums.detail.paymentConcepts.wizard'

  // Check for pending draft
  const { data: draftResponse } = useWizardDraft('payment_concept', condominiumId, {
    enabled: !!condominiumId,
  })
  const deleteDraftMutation = useDeleteWizardDraft('payment_concept', condominiumId)
  const hasPendingDraft = !!draftResponse?.data

  const handleDiscardDraft = useCallback(() => {
    queryClient.setQueryData(wizardDraftKeys.detail('payment_concept', condominiumId), null)
    deleteDraftMutation.mutate()
  }, [queryClient, condominiumId, deleteDraftMutation])

  // Local filter state (initialized from server-provided query)
  const [searchInput, setSearchInput] = useState(initialQuery.search || '')
  const [typeFilter, setTypeFilter] = useState<TTypeFilter>(
    (initialQuery.conceptType as TTypeFilter) || 'all'
  )
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>(
    initialQuery.isActive === undefined ? 'all' : initialQuery.isActive ? 'active' : 'inactive'
  )

  const isFirstRender = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const basePath = `/dashboard/condominiums/${condominiumId}/payment-concepts`

  // Update URL with new query params (triggers server re-fetch)
  const updateUrl = useCallback(
    (updates: Partial<TPaymentConceptsQuery>) => {
      const params = new URLSearchParams(searchParams.toString())

      if (updates.page !== undefined) {
        if (updates.page === 1) params.delete('page')
        else params.set('page', String(updates.page))
      }

      if (updates.limit !== undefined) {
        if (updates.limit === 10) params.delete('limit')
        else params.set('limit', String(updates.limit))
      }

      if (updates.search !== undefined) {
        if (!updates.search) params.delete('search')
        else params.set('search', updates.search)
      }

      if ('conceptType' in updates) {
        if (!updates.conceptType) params.delete('conceptType')
        else params.set('conceptType', updates.conceptType)
      }

      if ('isActive' in updates) {
        // undefined = "all" (no filter), true = active (default, remove param), false = inactive
        if (updates.isActive === true) params.delete('isActive')
        else if (updates.isActive === undefined) params.set('isActive', 'all')
        else params.set('isActive', 'false')
      }

      const queryString = params.toString()

      router.push(`${basePath}${queryString ? `?${queryString}` : ''}`)
    },
    [router, searchParams, basePath]
  )

  // Debounced search effect
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false

      return
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(() => {
      updateUrl({ search: searchInput || undefined, page: 1 })
    }, 500)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [searchInput, updateUrl])

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

  // Handlers
  const handleTypeChange = useCallback(
    (key: string | null) => {
      if (key) {
        setTypeFilter(key as TTypeFilter)
        updateUrl({
          conceptType: key === 'all' ? undefined : key,
          page: 1,
        })
      }
    },
    [updateUrl]
  )

  const handleStatusChange = useCallback(
    (key: string | null) => {
      if (key) {
        setStatusFilter(key as TStatusFilter)
        updateUrl({
          isActive: key === 'all' ? undefined : key === 'active',
          page: 1,
        })
      }
    },
    [updateUrl]
  )

  const handleClearFilters = useCallback(() => {
    setTypeFilter('all')
    setStatusFilter('active')
    setSearchInput('')
    router.push(basePath)
  }, [router, basePath])

  const handleRowClick = useCallback(
    (concept: TPaymentConcept) => {
      router.push(`${basePath}/${concept.id}`)
    },
    [router, basePath]
  )

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'active' || searchInput !== ''

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h3">{t.title}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t.subtitle}
          </Typography>
        </div>
        <Button
          className="w-full sm:w-auto"
          color="primary"
          href={`${basePath}/create`}
          startContent={<Plus size={16} />}
        >
          {t.addConcept}
        </Button>
      </div>

      {/* Pending draft banner */}
      {hasPendingDraft && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning-200 bg-warning-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FilePen className="shrink-0 text-warning-600" size={20} />
            <Typography color="default" variant="body2">
              {tr(`${draftW}.pendingDraft`)}
            </Typography>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 sm:flex-initial"
              size="sm"
              variant="flat"
              onPress={handleDiscardDraft}
            >
              {tr(`${draftW}.discardDraft`)}
            </Button>
            <Button
              className="flex-1 sm:flex-initial"
              color="primary"
              href={`${basePath}/create`}
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
          onClear={() => {
            setSearchInput('')
            updateUrl({ search: undefined, page: 1 })
          }}
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

      {/* Content */}
      {paymentConcepts.length === 0 ? (
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
            onLimitChange={newLimit => updateUrl({ limit: newLimit, page: 1 })}
            onPageChange={newPage => updateUrl({ page: newPage })}
          />
        </>
      )}
    </div>
  )
}
