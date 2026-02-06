'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Spinner } from '@/ui/components/spinner'
import { Tooltip } from '@/ui/components/tooltip'
import { ClearFiltersButton } from '@/ui/components/filters'
import { Home, Search, MoreVertical, Eye, Power, MapPin, Plus, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TCondominium, TCondominiumsQuery } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import {
  useCompanyCondominiumsPaginated,
  updateCondominium,
  HttpError,
  useQueryClient,
  companyCondominiumsKeys,
  useCanCreateResource,
} from '@packages/http-client'
import { useUser, useAuth } from '@/contexts'
import { CreateCondominiumForm } from './CreateCondominiumForm'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TCondominiumRow = TCondominium & { id: string }

interface CompanyCondominiumsTableProps {
  companyId: string
  isCompanyActive: boolean
}

export function CompanyCondominiumsTable({ companyId, isCompanyActive }: CompanyCondominiumsTableProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { user } = useUser()
  const { user: firebaseUser } = useAuth()

  // Filter state
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [token, setToken] = useState<string>('')

  const isFirstRender = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Get Firebase token
  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Check if can create condominium
  const {
    data: canCreateData,
    isLoading: isCheckingLimit,
    error: canCreateError,
  } = useCanCreateResource({
    token,
    managementCompanyId: companyId,
    resourceType: 'condominium',
    enabled: !!token && !!companyId,
  })

  const canCreate = canCreateData?.data?.canCreate ?? false
  const limitInfo = canCreateData?.data
  const hasNoSubscription = !!canCreateError

  // Debounce search input
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(1) // Reset to first page on search
    }, 500)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [searchInput])

  // Build query for API
  const query: TCondominiumsQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
    [page, limit, debouncedSearch, statusFilter]
  )

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

  // Fetch data from API with pagination
  const { data, isLoading, error, refetch } = useCompanyCondominiumsPaginated({
    companyId,
    query,
    enabled: !!companyId,
  })

  const condominiums = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) {
      setStatusFilter(key as TStatusFilter)
      setPage(1)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setPage(1)
  }, [])

  const handleCreateClick = useCallback(() => {
    if (!canCreate && limitInfo) {
      toast.error(
        t('superadmin.condominiums.errors.limitReached', {
          current: limitInfo.currentCount,
          max: limitInfo.maxAllowed ?? t('superadmin.condominiums.unlimited'),
        })
      )
      return
    }

    setIsFormOpen(true)
  }, [canCreate, limitInfo, toast, t])

  const handleViewDetails = useCallback(
    (id: string) => {
      router.push(`/dashboard/condominiums/${id}`)
    },
    [router]
  )

  const handleToggleStatus = useCallback(
    async (condominium: TCondominium) => {
      setIsToggling(condominium.id)
      try {
        await updateCondominium(condominium.id, {
          isActive: !condominium.isActive,
        })
        toast.success(
          condominium.isActive
            ? t('superadmin.condominiums.actions.deactivateSuccess')
            : t('superadmin.condominiums.actions.activateSuccess')
        )
        queryClient.invalidateQueries({ queryKey: companyCondominiumsKeys.all })
      } catch (err) {
        if (HttpError.isHttpError(err)) {
          toast.error(err.message)
        } else {
          toast.error(t('superadmin.condominiums.actions.statusUpdateError'))
        }
      } finally {
        setIsToggling(null)
      }
    },
    [t, toast, queryClient]
  )

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
                    isDisabled={isToggling === condominium.id}
                    startContent={
                      isToggling === condominium.id ? <Spinner size="sm" /> : <Power size={16} />
                    }
                    onPress={() => handleToggleStatus(condominium)}
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
    [t, handleViewDetails, handleToggleStatus, isToggling]
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
      {/* Filters and create button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-1">
          <Input
            className="w-full sm:max-w-md"
            placeholder={t('superadmin.condominiums.filters.searchPlaceholder')}
            startContent={<Search className="text-default-400" size={16} />}
            value={searchInput}
            onValueChange={handleSearchChange}
          />
          <Select
            aria-label={t('superadmin.condominiums.filters.status')}
            className="w-full sm:w-48"
            items={statusFilterItems}
            value={statusFilter}
            onChange={handleStatusChange}
            variant="bordered"
          />
          {(debouncedSearch || statusFilter !== 'all') && (
            <ClearFiltersButton onClear={handleClearFilters} />
          )}
        </div>
        {isCompanyActive && (
          <div className="flex items-center gap-2">
            <Button
              color="primary"
              startContent={<Plus size={16} />}
              onPress={handleCreateClick}
              isLoading={isCheckingLimit}
              isDisabled={isCheckingLimit || !canCreate || hasNoSubscription}
            >
              {t('superadmin.condominiums.create')}
            </Button>
            {(isCheckingLimit || !canCreate || hasNoSubscription) && (
              <Tooltip
                content={
                  <div className="max-w-xs">
                    {isCheckingLimit
                      ? t('superadmin.condominiums.checkingLimit')
                      : hasNoSubscription
                        ? t('superadmin.condominiums.errors.noActiveSubscription')
                        : !canCreate && limitInfo?.limitReached
                          ? t('superadmin.condominiums.errors.limitReachedTooltip', {
                              current: limitInfo.currentCount,
                              max: limitInfo.maxAllowed ?? t('superadmin.condominiums.unlimited'),
                            })
                          : t('superadmin.condominiums.errors.cannotCreate')}
                  </div>
                }
                placement="top"
                showArrow
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-default-100 hover:bg-default-200 transition-colors cursor-help">
                  <Info className="text-default-500" size={18} />
                </div>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : condominiums.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Home className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {debouncedSearch || statusFilter !== 'all'
              ? t('superadmin.condominiums.noResults')
              : t('superadmin.condominiums.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {debouncedSearch || statusFilter !== 'all'
              ? t('superadmin.condominiums.noResultsDescription')
              : t('superadmin.condominiums.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
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

          {/* Pagination */}
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

      {/* Create Condominium Modal */}
      {user && token && (
        <CreateCondominiumForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          managementCompanyId={companyId}
          createdBy={user.id}
          token={token}
        />
      )}
    </div>
  )
}
