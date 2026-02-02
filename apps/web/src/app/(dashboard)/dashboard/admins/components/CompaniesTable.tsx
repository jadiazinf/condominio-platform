'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Spinner } from '@/ui/components/spinner'
import { Building2, Search, MoreVertical, Eye, Power, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TManagementCompany, TManagementCompaniesQuery } from '@packages/domain'

import { useTranslation, useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import {
  useManagementCompaniesPaginated,
  toggleManagementCompanyActive,
  useQueryClient,
} from '@packages/http-client'
import { useToast } from '@/ui/components/toast'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TCompanyRow = TManagementCompany & { id: string }

export function CompaniesTable() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user: firebaseUser } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [token, setToken] = useState<string>('')

  // Get token on mount and when firebase user changes
  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [isToggling, setIsToggling] = useState<string | null>(null)

  // Build query
  const query: TManagementCompaniesQuery = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
    [page, limit, search, statusFilter]
  )

  // Fetch data from API
  const { data, isLoading, error, refetch } = useManagementCompaniesPaginated({
    token,
    query,
    enabled: !!token,
  })

  const companies = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('superadmin.companies.status.all') },
      { key: 'active', label: t('superadmin.companies.status.active') },
      { key: 'inactive', label: t('superadmin.companies.status.inactive') },
    ],
    [t]
  )

  // Table columns
  const tableColumns: ITableColumn<TCompanyRow>[] = useMemo(
    () => [
      { key: 'name', label: t('superadmin.companies.table.name') },
      { key: 'taxId', label: t('superadmin.companies.table.taxId') },
      { key: 'email', label: t('superadmin.companies.table.email') },
      { key: 'status', label: t('superadmin.companies.table.status') },
      { key: 'actions', label: t('superadmin.companies.table.actions') },
    ],
    [t]
  )

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }, [])

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) {
      setStatusFilter(key as TStatusFilter)
      setPage(1)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('active')
    setPage(1)
  }, [])

  const handleToggleActive = useCallback(
    async (company: TManagementCompany) => {
      if (!token) return

      setIsToggling(company.id)
      try {
        await toggleManagementCompanyActive(token, company.id, !company.isActive)
        queryClient.invalidateQueries({ queryKey: ['management-companies'] })
        toast.success(
          company.isActive
            ? t('superadmin.companies.actions.deactivateSuccess')
            : t('superadmin.companies.actions.activateSuccess')
        )
      } catch {
        toast.error(t('superadmin.companies.actions.toggleError'))
      } finally {
        setIsToggling(null)
      }
    },
    [token, queryClient, t]
  )

  const handleViewDetails = useCallback(
    (id: string) => {
      router.push(`/dashboard/admins/${id}`)
    },
    [router]
  )

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
        case 'actions':
          return (
            <div onClick={e => e.stopPropagation()}>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly variant="light">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Actions">
                  <DropdownItem
                    key="view"
                    startContent={<Eye size={16} />}
                    onPress={() => handleViewDetails(company.id)}
                  >
                    {t('superadmin.companies.actions.view')}
                  </DropdownItem>
                  <DropdownItem
                    key="toggle"
                    color={company.isActive ? 'warning' : 'success'}
                    isDisabled={isToggling === company.id}
                    startContent={isToggling === company.id ? <Spinner /> : <Power size={16} />}
                    onPress={() => handleToggleActive(company)}
                  >
                    {company.isActive
                      ? t('superadmin.companies.actions.deactivate')
                      : t('superadmin.companies.actions.activate')}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          )
        default:
          return null
      }
    },
    [t, handleViewDetails, handleToggleActive, isToggling]
  )

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          Error al cargar las administradoras
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t('superadmin.companies.filters.searchPlaceholder')}
          startContent={<Search className="text-default-400" size={16} />}
          value={search}
          onValueChange={handleSearchChange}
        />
        <Select
          aria-label={t('superadmin.companies.filters.status')}
          className="w-full sm:w-40"
          items={statusFilterItems}
          value={statusFilter}
          onChange={handleStatusChange}
          variant="bordered"
        />
        {(search || statusFilter !== 'active') && (
          <Button startContent={<X size={14} />} variant="flat" onPress={handleClearFilters}>
            {t('superadmin.companies.filters.clearFilters')}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Building2 className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('superadmin.companies.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.companies.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TCompanyRow>
            aria-label={t('superadmin.companies.title')}
            columns={tableColumns}
            rows={companies}
            renderCell={renderCell}
            onRowClick={company => handleViewDetails(company.id)}
            classNames={{
              tr: 'cursor-pointer transition-colors hover:bg-default-100',
            }}
          />

          {/* Pagination */}
          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={[10, 20, 50, 100]}
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
