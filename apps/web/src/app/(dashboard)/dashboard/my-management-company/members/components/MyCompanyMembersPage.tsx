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
import { User, Plus, Crown, Search, X } from 'lucide-react'
import { Avatar } from '@/ui/components/avatar-base'
import { useTranslation } from '@/contexts'
import type { TManagementCompanyMembersQuery } from '@packages/domain'

import {
  useMyCompanyMembersPaginated,
  useCompanyCondominiumsPaginated,
} from '@packages/http-client'

type TRoleFilter = 'all' | 'admin' | 'accountant' | 'support' | 'viewer'
type TStatusFilter = 'all' | 'active' | 'inactive'

interface TMemberRow {
  id: string
  roleName: string
  isActive: boolean
  isPrimaryAdmin: boolean
  joinedAt: Date | string
  user?: {
    id?: string
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string
    photoUrl?: string | null
  } | null
}

interface MyCompanyMembersPageProps {
  managementCompanyId: string
}

function getMemberDisplayName(user: TMemberRow['user']): string {
  if (!user) return 'Sin nombre'
  if (user.displayName) return user.displayName
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ')
  }
  return 'Sin nombre'
}

export function MyCompanyMembersPage({ managementCompanyId }: MyCompanyMembersPageProps) {
  const router = useRouter()
  const { t } = useTranslation()

  // Filter state
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<TRoleFilter>('all')
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
  const query: TManagementCompanyMembersQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      roleName: roleFilter === 'all' ? undefined : roleFilter,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      condominiumId: condominiumFilter === 'all' ? undefined : condominiumFilter,
    }),
    [page, limit, debouncedSearch, roleFilter, statusFilter, condominiumFilter]
  )

  // Role filter items
  const roleFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.company.myCompany.members.allRoles') },
      { key: 'admin', label: t('common.roles.admin') },
      { key: 'accountant', label: t('common.roles.accountant') },
      { key: 'support', label: t('common.roles.support') },
      { key: 'viewer', label: t('common.roles.viewer') },
    ],
    [t]
  )

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.company.myCompany.members.allStatuses') },
      { key: 'active', label: t('admin.company.myCompany.members.active') },
      { key: 'inactive', label: t('admin.company.myCompany.members.inactive') },
    ],
    [t]
  )

  // Condominium filter items
  const condominiumFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.company.myCompany.members.allCondominiums') },
      ...condominiums.map(c => ({ key: c.id, label: c.name })),
    ],
    [condominiums, t]
  )

  // Table columns
  const tableColumns: ITableColumn<TMemberRow>[] = useMemo(
    () => [
      { key: 'member', label: t('admin.company.myCompany.members.columns.member') },
      { key: 'roleName', label: t('admin.company.myCompany.members.columns.role') },
      { key: 'joinedAt', label: t('admin.company.myCompany.members.columns.joinedAt') },
      { key: 'status', label: t('admin.company.myCompany.members.columns.status') },
    ],
    [t]
  )

  // Fetch data from API with pagination
  const { data, isLoading, error, refetch } = useMyCompanyMembersPaginated({
    companyId: managementCompanyId,
    query,
    enabled: !!managementCompanyId,
  })

  const members = (data?.data ?? []) as TMemberRow[]
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

  const handleRoleChange = useCallback((key: string | null) => {
    if (key) {
      setRoleFilter(key as TRoleFilter)
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
    setRoleFilter('all')
    setStatusFilter('active')
    setCondominiumFilter('all')
    setPage(1)
  }, [])

  const handleRowClick = useCallback(
    (member: TMemberRow) => {
      router.push(`/dashboard/my-management-company/members/${member.id}`)
    },
    [router]
  )

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'primary'
      case 'accountant':
        return 'secondary'
      case 'support':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: t('common.roles.admin'),
      accountant: t('common.roles.accountant'),
      support: t('common.roles.support'),
      viewer: t('common.roles.viewer'),
    }
    return labels[role.toLowerCase()] || role
  }

  const renderCell = useCallback(
    (member: TMemberRow, columnKey: keyof TMemberRow | string) => {
      const displayName = getMemberDisplayName(member.user)

      switch (columnKey) {
        case 'member':
          return (
            <div className="flex items-center gap-3">
              <Avatar name={displayName} src={member.user?.photoUrl ?? undefined} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{displayName}</p>
                  {member.isPrimaryAdmin && <Crown className="text-warning" size={14} />}
                </div>
                <p className="text-xs text-default-500">{member.user?.email || 'Sin email'}</p>
              </div>
            </div>
          )
        case 'roleName':
          return (
            <Chip color={getRoleColor(member.roleName)} variant="flat">
              {getRoleLabel(member.roleName)}
            </Chip>
          )
        case 'joinedAt':
          return <p className="text-sm text-default-600">{formatDate(member.joinedAt)}</p>
        case 'status':
          return (
            <Chip color={member.isActive ? 'success' : 'default'} variant="dot">
              {member.isActive
                ? t('admin.company.myCompany.members.active')
                : t('admin.company.myCompany.members.inactive')}
            </Chip>
          )
        default:
          return null
      }
    },
    [t]
  )

  const hasActiveFilters =
    searchInput || roleFilter !== 'all' || statusFilter !== 'active' || condominiumFilter !== 'all'

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('admin.company.myCompany.members.error')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('admin.company.myCompany.members.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">{t('admin.company.myCompany.members.title')}</Typography>
          <Typography color="muted" variant="body2" className="mt-1">
            {t('admin.company.myCompany.members.subtitle')}
          </Typography>
        </div>
        <Button color="primary" startContent={<Plus size={16} />} isDisabled>
          {t('admin.company.myCompany.members.addMember')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t('admin.company.myCompany.members.search')}
          startContent={<Search className="text-default-400" size={16} />}
          value={searchInput}
          onValueChange={handleSearchChange}
        />
        <Select
          aria-label={t('admin.company.myCompany.members.filterRole')}
          className="w-full sm:w-52"
          items={roleFilterItems}
          value={roleFilter}
          onChange={handleRoleChange}
          variant="bordered"
        />
        <Select
          aria-label={t('admin.company.myCompany.members.filterStatus')}
          className="w-full sm:w-36"
          items={statusFilterItems}
          value={statusFilter}
          onChange={handleStatusChange}
          variant="bordered"
        />
        {condominiums.length > 0 && (
          <Select
            aria-label={t('admin.company.myCompany.members.filterCondominium')}
            className="w-full sm:w-56"
            items={condominiumFilterItems}
            value={condominiumFilter}
            onChange={handleCondominiumChange}
            variant="bordered"
          />
        )}
        {hasActiveFilters && (
          <Button startContent={<X size={14} />} variant="flat" onPress={handleClearFilters}>
            {t('admin.company.myCompany.members.clear')}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <User className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {hasActiveFilters
              ? t('admin.company.myCompany.members.noResults')
              : t('admin.company.myCompany.members.noMembers')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {hasActiveFilters
              ? t('admin.company.myCompany.members.noResultsHint')
              : t('admin.company.myCompany.members.noMembersHint')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TMemberRow>
            aria-label={t('admin.company.myCompany.members.title')}
            columns={tableColumns}
            rows={members}
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
