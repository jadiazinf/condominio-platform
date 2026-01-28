'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Card, CardBody } from '@/ui/components/card'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Home, Search, MoreVertical, Eye, Power, X, MapPin, Plus, Building } from 'lucide-react'
import type { TCondominium, TCondominiumsQuery, TPaginationMeta } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import { LocationSelector } from '@/ui/components/location-selector'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TCondominiumRow = TCondominium & { id: string }

interface CondominiumsTableProps {
  condominiums: TCondominium[]
  pagination?: TPaginationMeta
  initialQuery: TCondominiumsQuery
}

export function CondominiumsTable({
  condominiums,
  pagination,
  initialQuery,
}: CondominiumsTableProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
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
      { key: 'all', label: t('superadmin.condominiums.status.all') },
      { key: 'active', label: t('superadmin.condominiums.status.active') },
      { key: 'inactive', label: t('superadmin.condominiums.status.inactive') },
    ],
    [t]
  )

  // Table columns
  const tableColumns: ITableColumn<TCondominiumRow>[] = useMemo(
    () => [
      { key: 'name', label: t('superadmin.condominiums.table.name') },
      { key: 'company', label: t('superadmin.condominiums.table.company') },
      { key: 'address', label: t('superadmin.condominiums.table.address') },
      { key: 'contact', label: t('superadmin.condominiums.table.contact') },
      { key: 'status', label: t('superadmin.condominiums.table.status') },
      { key: 'actions', label: t('superadmin.condominiums.table.actions') },
    ],
    [t]
  )

  // Update URL with new query params
  const updateUrl = useCallback(
    (updates: Partial<TCondominiumsQuery>) => {
      const params = new URLSearchParams(searchParams.toString())

      // Update or remove params based on values
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

      if (updates.isActive !== undefined) {
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
      router.push(`/dashboard/condominiums${queryString ? `?${queryString}` : ''}`)
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

  const handleViewDetails = useCallback((id: string) => {
    // TODO: Navigate to condominium detail page when implemented
    console.log('View condominium:', id)
  }, [])

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
                  {t('superadmin.condominiums.table.code')}: {condominium.code}
                </span>
              )}
            </div>
          )
        case 'company':
          return condominium.managementCompany ? (
            <div className="flex items-center gap-2">
              <Building className="text-default-400" size={14} />
              <span className="text-sm text-default-700">{condominium.managementCompany.name}</span>
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
              {t('superadmin.condominiums.noAddress')}
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
                  {t('superadmin.condominiums.noContact')}
                </span>
              )}
            </div>
          )
        case 'status':
          return (
            <Chip color={condominium.isActive ? 'success' : 'default'} variant="flat">
              {condominium.isActive
                ? t('superadmin.condominiums.status.active')
                : t('superadmin.condominiums.status.inactive')}
            </Chip>
          )
        case 'actions':
          return (
            <div onClick={e => e.stopPropagation()}>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly variant="light">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label={t('superadmin.condominiums.table.actions')}>
                  <DropdownItem
                    key="view"
                    startContent={<Eye size={16} />}
                    onPress={() => handleViewDetails(condominium.id)}
                  >
                    {t('superadmin.condominiums.actions.view')}
                  </DropdownItem>
                  <DropdownItem
                    key="toggle"
                    color={condominium.isActive ? 'warning' : 'success'}
                    startContent={<Power size={16} />}
                  >
                    {condominium.isActive
                      ? t('superadmin.condominiums.actions.deactivate')
                      : t('superadmin.condominiums.actions.activate')}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          )
        default:
          return null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end flex-1">
            <Input
              className="w-full sm:max-w-xs"
              placeholder={t('superadmin.condominiums.filters.searchPlaceholder')}
              startContent={<Search className="text-default-400" size={16} />}
              value={searchInput}
              onValueChange={setSearchInput}
            />
            <Select
              aria-label={t('superadmin.condominiums.filters.status')}
              className="w-full sm:w-40"
              items={statusFilterItems}
              value={statusFilter}
              onChange={handleStatusChange}
              variant="bordered"
            />
          </div>
          <Button color="primary" startContent={<Plus size={16} />}>
            {t('superadmin.condominiums.create')}
          </Button>
        </div>

        {/* Location Filter */}
        <LocationSelector
          value={locationFilter}
          onChange={handleLocationChange}
          label={t('superadmin.condominiums.filters.location')}
        />

        {hasActiveFilters && (
          <Button startContent={<X size={14} />} variant="flat" onPress={handleClearFilters}>
            {t('superadmin.condominiums.filters.clearFilters')}
          </Button>
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <Typography color="muted" variant="body2">
          {t('superadmin.condominiums.count', {
            filtered: condominiums.length,
            total: resolvedPagination.total,
          })}
        </Typography>
      </div>

      {/* Empty state */}
      {condominiums.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Home className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {resolvedPagination.total === 0
              ? t('superadmin.condominiums.empty')
              : t('superadmin.condominiums.noResults')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {resolvedPagination.total === 0
              ? t('superadmin.condominiums.emptyDescription')
              : t('superadmin.condominiums.noResultsDescription')}
          </Typography>
        </div>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="block space-y-3 md:hidden">
            {condominiums.map(condominium => (
              <Card
                key={condominium.id}
                className="cursor-pointer transition-all hover:shadow-md"
                isPressable
                onPress={() => handleViewDetails(condominium.id)}
              >
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Home className="text-primary shrink-0" size={18} />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{condominium.name}</p>
                        {condominium.code && (
                          <p className="text-xs text-default-500">
                            {t('superadmin.condominiums.table.code')}: {condominium.code}
                          </p>
                        )}
                      </div>
                    </div>
                    <Chip color={condominium.isActive ? 'success' : 'default'} variant="flat">
                      {condominium.isActive
                        ? t('superadmin.condominiums.status.active')
                        : t('superadmin.condominiums.status.inactive')}
                    </Chip>
                  </div>

                  {condominium.managementCompany && (
                    <div className="flex items-center gap-2 text-xs text-default-500">
                      <Building size={14} />
                      <span>{condominium.managementCompany.name}</span>
                    </div>
                  )}

                  {condominium.address && (
                    <div className="flex items-center gap-2 text-xs text-default-500">
                      <MapPin size={14} />
                      <span className="truncate">{condominium.address}</span>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table<TCondominiumRow>
              aria-label={t('superadmin.condominiums.title')}
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
          {resolvedPagination.totalPages > 1 && (
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
          )}
        </>
      )}
    </div>
  )
}
