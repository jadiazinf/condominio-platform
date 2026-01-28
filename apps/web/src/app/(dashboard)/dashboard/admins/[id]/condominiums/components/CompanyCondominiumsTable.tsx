'use client'

import { useState, useCallback, useMemo } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Spinner } from '@/ui/components/spinner'
import { Home, Search, MoreVertical, Eye, Power, X, MapPin, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TCondominium } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { useCompanyCondominiums, useQueryClient } from '@packages/http-client'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TCondominiumRow = TCondominium & { id: string }

interface CompanyCondominiumsTableProps {
  companyId: string
}

export function CompanyCondominiumsTable({ companyId }: CompanyCondominiumsTableProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

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
      { key: 'code', label: t('superadmin.condominiums.table.code') },
      { key: 'address', label: t('superadmin.condominiums.table.address') },
      { key: 'contact', label: t('superadmin.condominiums.table.contact') },
      { key: 'status', label: t('superadmin.condominiums.table.status') },
      { key: 'actions', label: t('superadmin.condominiums.table.actions') },
    ],
    [t]
  )

  // Fetch data from API
  const { data, isLoading, error, refetch } = useCompanyCondominiums(companyId, {
    enabled: !!companyId,
  })

  const allCondominiums = data?.data ?? []

  // Client-side filtering
  const filteredCondominiums = useMemo(() => {
    return allCondominiums.filter(condo => {
      // Search filter
      const matchesSearch =
        !search ||
        condo.name.toLowerCase().includes(search.toLowerCase()) ||
        condo.code?.toLowerCase().includes(search.toLowerCase()) ||
        condo.address?.toLowerCase().includes(search.toLowerCase()) ||
        condo.email?.toLowerCase().includes(search.toLowerCase())

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && condo.isActive) ||
        (statusFilter === 'inactive' && !condo.isActive)

      return matchesSearch && matchesStatus
    })
  }, [allCondominiums, search, statusFilter])

  // Client-side pagination
  const paginatedCondominiums = useMemo(() => {
    const startIndex = (page - 1) * limit
    return filteredCondominiums.slice(startIndex, startIndex + limit)
  }, [filteredCondominiums, page, limit])

  const totalPages = Math.ceil(filteredCondominiums.length / limit)

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) {
      setStatusFilter(key as TStatusFilter)
      setPage(1)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('all')
    setPage(1)
  }, [])

  const handleViewDetails = useCallback((id: string) => {
    // TODO: Navigate to condominium detail page when implemented
    console.log('View condominium:', id)
  }, [])

  const renderCell = useCallback(
    (condominium: TCondominium, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return (
            <div className="flex items-center gap-2">
              <Home className="text-primary" size={16} />
              <span className="font-medium">{condominium.name}</span>
            </div>
          )
        case 'code':
          return <span className="text-sm text-default-600">{condominium.code || '-'}</span>
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
    [t, handleViewDetails]
  )

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('superadmin.condominiums.error')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Input
            className="w-full sm:max-w-xs"
            placeholder={t('superadmin.condominiums.filters.searchPlaceholder')}
            startContent={<Search className="text-default-400" size={16} />}
            value={search}
            onValueChange={handleSearchChange}
          />
          <Select
            aria-label={t('superadmin.condominiums.filters.status')}
            className="w-full sm:w-40"
            items={statusFilterItems}
            value={statusFilter}
            onChange={handleStatusChange}
            variant="bordered"
          />
          {(search || statusFilter !== 'all') && (
            <Button startContent={<X size={14} />} variant="flat" onPress={handleClearFilters}>
              {t('superadmin.condominiums.filters.clearFilters')}
            </Button>
          )}
        </div>
        <Button color="primary" startContent={<Plus size={16} />}>
          {t('superadmin.condominiums.create')}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filteredCondominiums.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Home className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {allCondominiums.length === 0
              ? t('superadmin.condominiums.empty')
              : t('superadmin.condominiums.noResults')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {allCondominiums.length === 0
              ? t('superadmin.condominiums.emptyDescription')
              : t('superadmin.condominiums.noResultsDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TCondominiumRow>
            aria-label={t('superadmin.condominiums.title')}
            columns={tableColumns}
            rows={paginatedCondominiums}
            renderCell={renderCell}
            onRowClick={condominium => handleViewDetails(condominium.id)}
            classNames={{
              tr: 'cursor-pointer transition-colors hover:bg-default-100',
            }}
          />

          {/* Pagination */}
          {filteredCondominiums.length > limit && (
            <Pagination
              className="mt-4"
              limit={limit}
              limitOptions={[10, 20, 50]}
              page={page}
              total={filteredCondominiums.length}
              totalPages={totalPages}
              onLimitChange={newLimit => {
                setLimit(newLimit)
                setPage(1)
              }}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
