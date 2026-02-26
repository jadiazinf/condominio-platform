'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Input } from '@/ui/components/input'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { useDisclosure } from '@/ui/components/modal'
import { Wrench, Plus, X, Search, ChevronRight } from 'lucide-react'
import type { TCondominiumService, TCondominiumServicesQuery } from '@packages/domain'

import { CreateServiceModal } from './CreateServiceModal'
import { useCondominiumServicesPaginated } from '@packages/http-client/hooks'

type TProviderFilter = 'all' | 'individual' | 'company' | 'cooperative' | 'government' | 'internal'
type TStatusFilter = 'all' | 'active' | 'inactive'

interface ServicesPageClientProps {
  condominiumId: string
  managementCompanyId: string
  translations: {
    title: string
    subtitle: string
    empty: string
    emptyDescription: string
    addService: string
    table: {
      name: string
      providerType: string
      contact: string
      status: string
    }
    providerTypes: {
      individual: string
      company: string
      cooperative: string
      government: string
      internal: string
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
    status: {
      active: string
      inactive: string
    }
  }
}

const PROVIDER_TYPE_COLORS = {
  individual: 'primary',
  company: 'secondary',
  cooperative: 'warning',
  government: 'danger',
  internal: 'default',
} as const

export function ServicesPageClient({
  condominiumId,
  managementCompanyId,
  translations: t,
}: ServicesPageClientProps) {
  const createModal = useDisclosure()
  const router = useRouter()

  // Filter state
  const [providerFilter, setProviderFilter] = useState<TProviderFilter>('all')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Build query for API
  const query: TCondominiumServicesQuery = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      providerType: providerFilter === 'all' ? undefined : providerFilter,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
    [page, limit, search, providerFilter, statusFilter]
  )

  // Provider type filter items
  const providerFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t.filters.allTypes },
      { key: 'individual', label: t.providerTypes.individual },
      { key: 'company', label: t.providerTypes.company },
      { key: 'cooperative', label: t.providerTypes.cooperative },
      { key: 'government', label: t.providerTypes.government },
      { key: 'internal', label: t.providerTypes.internal },
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

  // Table columns
  const tableColumns: ITableColumn<TCondominiumService>[] = useMemo(
    () => [
      { key: 'name', label: t.table.name },
      { key: 'providerType', label: t.table.providerType },
      { key: 'contact', label: t.table.contact },
      { key: 'isActive', label: t.table.status },
      { key: 'actions', label: '' },
    ],
    [t]
  )

  // Fetch data
  const { data, isLoading, error, refetch } = useCondominiumServicesPaginated({
    companyId: managementCompanyId,
    condominiumId,
    query,
    enabled: !!managementCompanyId,
  })

  const services = (data?.data ?? []) as TCondominiumService[]
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  // Handlers
  const handleProviderChange = useCallback((key: string | null) => {
    if (key) {
      setProviderFilter(key as TProviderFilter)
      setPage(1)
    }
  }, [])

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) {
      setStatusFilter(key as TStatusFilter)
      setPage(1)
    }
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setProviderFilter('all')
    setStatusFilter('active')
    setSearch('')
    setPage(1)
  }, [])

  const handleRowClick = useCallback(
    (service: TCondominiumService) => {
      router.push(`/dashboard/condominiums/${condominiumId}/services/${service.id}`)
    },
    [router, condominiumId]
  )

  const renderCell = useCallback(
    (service: TCondominiumService, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{service.name}</span>
              {service.legalName && (
                <span className="text-xs text-default-500 line-clamp-1">{service.legalName}</span>
              )}
            </div>
          )
        case 'providerType':
          return (
            <Chip
              color={
                PROVIDER_TYPE_COLORS[service.providerType as keyof typeof PROVIDER_TYPE_COLORS] ||
                'default'
              }
              variant="flat"
              size="sm"
            >
              {t.providerTypes[service.providerType as keyof typeof t.providerTypes] ||
                service.providerType}
            </Chip>
          )
        case 'contact':
          return (
            <div className="flex flex-col gap-0.5">
              {service.email && <span className="text-xs text-default-600">{service.email}</span>}
              {service.phone && (
                <span className="text-xs text-default-500">
                  {service.phoneCountryCode || ''}
                  {service.phone}
                </span>
              )}
              {!service.email && !service.phone && (
                <span className="text-xs text-default-400">-</span>
              )}
            </div>
          )
        case 'isActive':
          return (
            <Chip color={service.isActive ? 'success' : 'default'} variant="dot" size="sm">
              {service.isActive ? t.status.active : t.status.inactive}
            </Chip>
          )
        case 'actions':
          return (
            <div className="flex justify-end">
              <ChevronRight size={16} className="text-default-400" />
            </div>
          )
        default:
          return null
      }
    },
    [t]
  )

  const hasActiveFilters = providerFilter !== 'all' || statusFilter !== 'active' || search !== ''

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h3">{t.title}</Typography>
            <Typography color="muted" variant="body2" className="mt-1">
              {t.subtitle}
            </Typography>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
          <Typography color="danger" variant="body1">
            Error al cargar los servicios
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
          <Typography color="muted" variant="body2" className="mt-1">
            {t.subtitle}
          </Typography>
        </div>
        <Button color="primary" startContent={<Plus size={16} />} onPress={createModal.onOpen}>
          {t.addService}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
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
          aria-label={t.table.providerType}
          className="w-full sm:w-44"
          items={providerFilterItems}
          value={providerFilter}
          onChange={handleProviderChange}
          variant="bordered"
        />
        <Select
          aria-label={t.table.status}
          className="w-full sm:w-36"
          items={statusFilterItems}
          value={statusFilter}
          onChange={handleStatusChange}
          variant="bordered"
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
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Wrench className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {hasActiveFilters ? t.noResults : t.empty}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {hasActiveFilters ? t.noResultsHint : t.emptyDescription}
          </Typography>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="block space-y-3 md:hidden">
            {services.map(service => (
              <Card
                key={service.id}
                className="w-full cursor-pointer hover:bg-default-50 transition-colors"
                isPressable
                onPress={() => handleRowClick(service)}
              >
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      {service.legalName && (
                        <p className="text-xs text-default-500">{service.legalName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip color={service.isActive ? 'success' : 'default'} variant="dot" size="sm">
                        {service.isActive ? t.status.active : t.status.inactive}
                      </Chip>
                      <ChevronRight size={14} className="text-default-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip
                      color={
                        PROVIDER_TYPE_COLORS[
                          service.providerType as keyof typeof PROVIDER_TYPE_COLORS
                        ] || 'default'
                      }
                      variant="flat"
                      size="sm"
                    >
                      {t.providerTypes[service.providerType as keyof typeof t.providerTypes] ||
                        service.providerType}
                    </Chip>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table<TCondominiumService>
              aria-label={t.title}
              columns={tableColumns}
              rows={services}
              renderCell={renderCell}
              onRowClick={handleRowClick}
              classNames={{
                tr: 'hover:bg-default-100 transition-colors cursor-pointer',
              }}
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

      {/* Create Modal */}
      <CreateServiceModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        condominiumId={condominiumId}
        managementCompanyId={managementCompanyId}
      />
    </div>
  )
}
