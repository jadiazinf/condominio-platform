'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { Home, Search, MapPin, Plus, Building } from 'lucide-react'
import type { TCondominium, TCondominiumsQuery, TPaginationMeta, TActiveRoleType } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import { LocationSelector } from '@/ui/components/location-selector'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { ClearFiltersButton } from '@/ui/components/filters'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TCondominiumRow = TCondominium & { id: string }

interface CondominiumsTableProps {
  condominiums: TCondominium[]
  pagination?: TPaginationMeta
  initialQuery: TCondominiumsQuery
  role?: TActiveRoleType | null
}

export function CondominiumsTable({
  condominiums,
  pagination,
  initialQuery,
  role,
}: CondominiumsTableProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()

  const isAdmin = role === 'management_company'
  const tp = isAdmin ? 'admin.condominiums' : 'superadmin.condominiums'

  const resolvedPagination: TPaginationMeta = pagination ?? {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  }

  // Local state for inputs (before debounce)
  const [searchInput, setSearchInput] = useState(initialQuery.search || '')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>(
    initialQuery.isActive === true ? 'active' : initialQuery.isActive === false ? 'inactive' : 'all'
  )
  const [locationFilter, setLocationFilter] = useState<string | null>(
    initialQuery.locationId || null
  )

  const isFirstRender = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t(`${tp}.status.all`) },
      { key: 'active', label: t(`${tp}.status.active`) },
      { key: 'inactive', label: t(`${tp}.status.inactive`) },
    ],
    [t, tp]
  )

  // Table columns — admin doesn't see "Company" column
  const tableColumns: ITableColumn<TCondominiumRow>[] = useMemo(() => {
    const columns: ITableColumn<TCondominiumRow>[] = [
      { key: 'name', label: t(`${tp}.table.name`) },
    ]
    if (!isAdmin) {
      columns.push({ key: 'company', label: t(`${tp}.table.company`) })
    }
    columns.push(
      { key: 'address', label: t(`${tp}.table.address`) },
      { key: 'contact', label: t(`${tp}.table.contact`) },
      { key: 'status', label: t(`${tp}.table.status`) },
    )
    return columns
  }, [t, tp, isAdmin])

  // Update URL with new query params
  const updateUrl = useCallback(
    (updates: Partial<TCondominiumsQuery>) => {
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

      if ('locationId' in updates) {
        if (!updates.locationId) {
          params.delete('locationId')
        } else {
          params.set('locationId', updates.locationId)
        }
      }

      const queryString = params.toString()
      const newUrl = `/dashboard/condominiums${queryString ? `?${queryString}` : ''}`
      router.push(newUrl)
    },
    [router, searchParams]
  )

  // Debounced search effect
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

  // Handlers
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

  const handleLocationChange = useCallback(
    (locationId: string | null) => {
      setLocationFilter(locationId)
      updateUrl({ locationId: locationId || undefined, page: 1 })
    },
    [updateUrl]
  )

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setStatusFilter('all')
    setLocationFilter(null)
    router.push('/dashboard/condominiums')
  }, [router])

  const handlePageChange = useCallback(
    (page: number) => {
      updateUrl({ page })
    },
    [updateUrl]
  )

  const handleLimitChange = useCallback(
    (limit: number) => {
      updateUrl({ limit, page: 1 })
    },
    [updateUrl]
  )

  const handleViewDetails = useCallback(
    (id: string) => {
      router.push(`/dashboard/condominiums/${id}`)
    },
    [router]
  )

  const hasActiveFilters = searchInput || statusFilter !== 'all' || locationFilter

  const renderCell = useCallback(
    (condominium: TCondominium, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Home className="text-primary" size={16} />
                <span className="font-medium">{condominium.name}</span>
              </div>
              {condominium.code && (
                <span className="text-xs text-default-500 ml-6">
                  {t(`${tp}.table.code`)}: {condominium.code}
                </span>
              )}
            </div>
          )
        case 'company':
          return condominium.managementCompanies && condominium.managementCompanies.length > 0 ? (
            <div className="flex flex-col gap-1">
              {condominium.managementCompanies.map((company) => (
                <div key={company.id} className="flex items-center gap-2">
                  <Building className="text-default-400" size={14} />
                  <span className="text-sm text-default-700">{company.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-default-400">
              {t('superadmin.condominiums.noCompany')}
            </span>
          )
        case 'address':
          return condominium.address ? (
            <div className="flex items-center gap-1 max-w-[200px]">
              <MapPin className="text-default-400 shrink-0" size={14} />
              <span className="text-sm text-default-600 truncate">{condominium.address}</span>
            </div>
          ) : (
            <span className="text-sm text-default-400">
              {t(`${tp}.noAddress`)}
            </span>
          )
        case 'contact':
          return (
            <div className="flex flex-col gap-0.5">
              {condominium.email && (
                <span className="text-xs text-default-600">{condominium.email}</span>
              )}
              {condominium.phone && (
                <span className="text-xs text-default-500">{condominium.phone}</span>
              )}
              {!condominium.email && !condominium.phone && (
                <span className="text-xs text-default-400">
                  {t(`${tp}.noContact`)}
                </span>
              )}
            </div>
          )
        case 'status':
          return (
            <Chip color={condominium.isActive ? 'success' : 'default'} variant="flat">
              {condominium.isActive
                ? t(`${tp}.status.active`)
                : t(`${tp}.status.inactive`)}
            </Chip>
          )
        default:
          return null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tp]
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end flex-1">
            <Input
              className="w-full sm:max-w-xs"
              placeholder={t(`${tp}.filters.searchPlaceholder`)}
              startContent={<Search className="text-default-400" size={16} />}
              value={searchInput}
              onValueChange={setSearchInput}
            />
            <Select
              aria-label={t(`${tp}.filters.status`)}
              placeholder={t(`${tp}.filters.status`)}
              className="w-full sm:w-40"
              items={statusFilterItems}
              value={statusFilter}
              onChange={handleStatusChange}
              variant="bordered"
            />
            {hasActiveFilters && (
              <ClearFiltersButton onClear={handleClearFilters} />
            )}
          </div>
          {!isAdmin && (
            <Button
              color="primary"
              startContent={<Plus size={16} />}
              onPress={() => router.push('/dashboard/condominiums/new')}
            >
              {t('superadmin.condominiums.create')}
            </Button>
          )}
        </div>

        {/* Location Filter — only for superadmin */}
        {!isAdmin && (
          <LocationSelector
            value={locationFilter}
            onChange={handleLocationChange}
            label={t('superadmin.condominiums.filters.location')}
          />
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <Typography color="muted" variant="body2">
          {t(`${tp}.count`, {
            filtered: resolvedPagination.total || condominiums.length,
            total: resolvedPagination.total || condominiums.length,
          })}
        </Typography>
      </div>

      {/* Empty state */}
      {condominiums.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Home className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {resolvedPagination.total === 0
              ? t(`${tp}.empty`)
              : t(`${tp}.noResults`)}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {resolvedPagination.total === 0
              ? t(`${tp}.emptyDescription`)
              : t(`${tp}.noResultsDescription`)}
          </Typography>
        </div>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="block space-y-3 md:hidden">
            {condominiums.map(condominium => (
              <Card
                key={condominium.id}
                className="w-full cursor-pointer transition-all hover:shadow-md"
                isPressable
                onPress={() => handleViewDetails(condominium.id)}
              >
                <CardBody className="flex flex-col h-[160px]">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Home className="text-primary shrink-0" size={18} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{condominium.name}</p>
                        {condominium.code && (
                          <p className="text-xs text-default-500">
                            {t(`${tp}.table.code`)}: {condominium.code}
                          </p>
                        )}
                      </div>
                    </div>
                    <Chip color={condominium.isActive ? 'success' : 'default'} variant="flat" size="sm">
                      {condominium.isActive
                        ? t(`${tp}.status.active`)
                        : t(`${tp}.status.inactive`)}
                    </Chip>
                  </div>

                  <div className="flex-1 space-y-2 overflow-hidden">
                    {/* Company info — only for superadmin */}
                    {!isAdmin && (
                      condominium.managementCompanies && condominium.managementCompanies.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {condominium.managementCompanies.map((company) => (
                            <div key={company.id} className="flex items-center gap-2 text-xs text-default-500">
                              <Building size={14} className="shrink-0" />
                              <span className="truncate">{company.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-default-400">
                          <Building size={14} className="shrink-0" />
                          <span>{t('superadmin.condominiums.noCompany')}</span>
                        </div>
                      )
                    )}

                    {condominium.address ? (
                      <div className="flex items-center gap-2 text-xs text-default-500">
                        <MapPin size={14} className="shrink-0" />
                        <span className="truncate">{condominium.address}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-default-400">
                        <MapPin size={14} className="shrink-0" />
                        <span>{t(`${tp}.noAddress`)}</span>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table<TCondominiumRow>
              aria-label={t(`${tp}.title`)}
              columns={tableColumns}
              rows={condominiums}
              renderCell={renderCell}
              onRowClick={condominium => handleViewDetails(condominium.id)}
              classNames={{
                tr: 'cursor-pointer transition-colors hover:bg-default-100',
              }}
            />
          </div>

          {/* Pagination */}
          <Pagination
            className="mt-4"
            limit={resolvedPagination.limit}
            limitOptions={[10, 20, 50]}
            page={resolvedPagination.page}
            total={resolvedPagination.total}
            totalPages={resolvedPagination.totalPages}
            onLimitChange={handleLimitChange}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  )
}
