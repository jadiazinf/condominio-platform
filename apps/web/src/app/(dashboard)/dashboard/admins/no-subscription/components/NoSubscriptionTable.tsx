'use client'

import type {
  TManagementCompany,
  TManagementCompaniesQuery,
  TPaginationMeta,
} from '@packages/domain'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building, Search } from 'lucide-react'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Input } from '@/ui/components/input'
import { ClearFiltersButton } from '@/ui/components/filters'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TCompanyRow = TManagementCompany & { id: string }

interface NoSubscriptionTableProps {
  companies: TManagementCompany[]
  pagination: TPaginationMeta
  initialQuery: TManagementCompaniesQuery
}

export function NoSubscriptionTable({
  companies,
  pagination,
  initialQuery,
}: NoSubscriptionTableProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(initialQuery.search || '')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>(
    initialQuery.isActive === true ? 'active' : initialQuery.isActive === false ? 'inactive' : 'all'
  )

  const isFirstRender = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('superadmin.companies.status.all') },
      { key: 'active', label: t('superadmin.companies.status.active') },
      { key: 'inactive', label: t('superadmin.companies.status.inactive') },
    ],
    [t]
  )

  const tableColumns: ITableColumn<TCompanyRow>[] = useMemo(
    () => [
      { key: 'name', label: t('superadmin.companies.table.name') },
      { key: 'taxId', label: t('superadmin.companies.table.taxId') },
      { key: 'email', label: t('superadmin.companies.table.email') },
      { key: 'status', label: t('superadmin.companies.table.status') },
    ],
    [t]
  )

  const updateUrl = useCallback(
    (updates: Partial<TManagementCompaniesQuery>) => {
      const params = new URLSearchParams(searchParams.toString())

      if (updates.page !== undefined) {
        if (updates.page === 1) {
          params.delete('page')
        } else {
          params.set('page', String(updates.page))
        }
      }

      if (updates.limit !== undefined) {
        if (updates.limit === 10) {
          params.delete('limit')
        } else {
          params.set('limit', String(updates.limit))
        }
      }

      if (updates.search !== undefined) {
        if (updates.search === '' || updates.search === undefined) {
          params.delete('search')
        } else {
          params.set('search', updates.search)
        }
      }

      if ('isActive' in updates) {
        if (updates.isActive === undefined) {
          params.delete('isActive')
        } else {
          params.set('isActive', String(updates.isActive))
        }
      }

      const queryString = params.toString()
      const newUrl = `/dashboard/admins/no-subscription${queryString ? `?${queryString}` : ''}`

      router.push(newUrl)
    },
    [router, searchParams]
  )

  // Debounced search
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false

      return
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      updateUrl({ search: searchInput || undefined, page: 1 })
    }, 500)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [searchInput, updateUrl])

  const handleStatusChange = useCallback(
    (key: string | null) => {
      if (key) {
        setStatusFilter(key as TStatusFilter)
        const isActive = key === 'all' ? undefined : key === 'active'

        updateUrl({ isActive, page: 1 })
      }
    },
    [updateUrl]
  )

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setStatusFilter('all')
    router.push('/dashboard/admins/no-subscription')
  }, [router])

  const handleViewDetails = useCallback(
    (id: string) => {
      router.push(`/dashboard/admins/${id}`)
    },
    [router]
  )

  const hasActiveFilters = searchInput || statusFilter !== 'all'

  const renderCell = useCallback(
    (company: TManagementCompany, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return (
            <div className="flex flex-col">
              <span className="font-medium">{company.name}</span>
              {company.legalName && (
                <span className="text-xs text-default-500">{company.legalName}</span>
              )}
            </div>
          )
        case 'taxId':
          return (
            <span className="text-sm">
              {company.taxIdType ? `${company.taxIdType}-${company.taxIdNumber || ''}` : '-'}
            </span>
          )
        case 'email':
          return <span className="text-sm">{company.email || '-'}</span>
        case 'status':
          return (
            <Chip color={company.isActive ? 'success' : 'default'} variant="flat">
              {company.isActive
                ? t('superadmin.companies.status.active')
                : t('superadmin.companies.status.inactive')}
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
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t('superadmin.companies.filters.searchPlaceholder')}
          startContent={<Search className="text-default-400" size={16} />}
          value={searchInput}
          onValueChange={setSearchInput}
        />
        <Select
          aria-label={t('superadmin.companies.filters.status')}
          className="w-full sm:w-40"
          items={statusFilterItems}
          value={statusFilter}
          variant="bordered"
          onChange={handleStatusChange}
        />
        {hasActiveFilters && <ClearFiltersButton onClear={handleClearFilters} />}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <Typography color="muted" variant="body2">
          {t('superadmin.noSubscription.count', { total: pagination.total })}
        </Typography>
      </div>

      {/* Empty state */}
      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Building className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('superadmin.noSubscription.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.noSubscription.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TCompanyRow>
            aria-label={t('superadmin.noSubscription.title')}
            classNames={{
              tr: 'cursor-pointer transition-colors hover:bg-default-100',
            }}
            columns={tableColumns}
            renderCell={renderCell}
            rows={companies}
            onRowClick={company => handleViewDetails(company.id)}
          />

          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={[10, 20, 50]}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onLimitChange={newLimit => updateUrl({ limit: newLimit, page: 1 })}
            onPageChange={page => updateUrl({ page })}
          />
        </>
      )}
    </div>
  )
}
