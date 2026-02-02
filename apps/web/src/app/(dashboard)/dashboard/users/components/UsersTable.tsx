'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Users, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useTranslation, useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import {
  useUsersPaginated,
  useRoles,
  type TUserWithRoles,
  type TUsersQuery,
} from '@packages/http-client/hooks'
import { Avatar } from '@/ui/components/avatar-base'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TUserRow = TUserWithRoles & { id: string }

export function UsersTable() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user: firebaseUser } = useAuth()
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
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Fetch roles for filter dropdown
  const { data: rolesData } = useRoles({
    token,
    enabled: !!token,
  })

  // Build query
  const query: TUsersQuery = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      roleId: roleFilter === 'all' ? undefined : roleFilter,
    }),
    [page, limit, search, statusFilter, roleFilter]
  )

  // Fetch data from API
  const { data, isLoading, error, refetch } = useUsersPaginated({
    token,
    query,
    enabled: !!token,
  })

  const users = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('superadmin.users.status.all') },
      { key: 'active', label: t('superadmin.users.status.active') },
      { key: 'inactive', label: t('superadmin.users.status.inactive') },
    ],
    [t]
  )

  // Helper to get role display name with translation fallback
  const getRoleLabel = useCallback(
    (roleName: string) => {
      const translationKey = `superadmin.users.roles.${roleName}`
      const translated = t(translationKey)
      // If translation returns the key itself, use the original role name
      return translated === translationKey ? roleName : translated
    },
    [t]
  )

  // Role filter items
  const roleFilterItems: ISelectItem[] = useMemo(() => {
    const items: ISelectItem[] = [{ key: 'all', label: t('superadmin.users.filters.allRoles') }]
    if (rolesData?.data) {
      rolesData.data.forEach(role => {
        items.push({
          key: role.id,
          label: getRoleLabel(role.name),
        })
      })
    }
    return items
  }, [rolesData, t, getRoleLabel])

  // Table columns
  const tableColumns: ITableColumn<TUserRow>[] = useMemo(
    () => [
      { key: 'user', label: t('superadmin.users.table.user') },
      { key: 'email', label: t('superadmin.users.table.email') },
      { key: 'document', label: t('superadmin.users.table.document') },
      { key: 'roles', label: t('superadmin.users.table.roles') },
      { key: 'status', label: t('superadmin.users.table.status') },
      { key: 'lastAccess', label: t('superadmin.users.table.lastAccess') },
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

  const handleRoleChange = useCallback((key: string | null) => {
    if (key) {
      setRoleFilter(key)
      setPage(1)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('active')
    setRoleFilter('all')
    setPage(1)
  }, [])

  const handleViewDetails = useCallback(
    (id: string) => {
      router.push(`/dashboard/users/${id}`)
    },
    [router]
  )

  const formatDate = useCallback((date: Date | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])


  const renderCell = useCallback(
    (user: TUserWithRoles, columnKey: string | number | symbol) => {
      switch (String(columnKey)) {
        case 'user':
          return (
            <div className="flex items-center gap-3">
              <Avatar
                name={
                  user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.displayName || user.email
                }
                size="sm"
                src={user.photoUrl || undefined}
              />
              <div className="flex flex-col">
                <span className="font-medium">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.displayName || '-'}
                </span>
              </div>
            </div>
          )
        case 'email':
          return <span className="text-sm">{user.email}</span>
        case 'document':
          return (
            <span className="text-sm">
              {user.idDocumentType && user.idDocumentNumber
                ? `${user.idDocumentType}-${user.idDocumentNumber}`
                : '-'}
            </span>
          )
        case 'roles':
          return (
            <div className="flex flex-wrap gap-1">
              {user.roles && user.roles.length > 0 ? (
                user.roles.slice(0, 3).map((role, index) => (
                  <Chip
                    key={index}
                    size="sm"
                    variant="flat"
                    color={role.roleName === 'SUPERADMIN' ? 'warning' : 'primary'}
                  >
                    {getRoleLabel(role.roleName)}
                  </Chip>
                ))
              ) : (
                <span className="text-sm text-default-400">-</span>
              )}
              {user.roles && user.roles.length > 3 && (
                <Chip size="sm" variant="flat" color="default">
                  +{user.roles.length - 3}
                </Chip>
              )}
            </div>
          )
        case 'status':
          return (
            <Chip color={user.isActive ? 'success' : 'default'} variant="flat">
              {user.isActive
                ? t('superadmin.users.status.active')
                : t('superadmin.users.status.inactive')}
            </Chip>
          )
        case 'lastAccess':
          return (
            <span className="text-sm text-default-500">{formatDate(user.lastLogin)}</span>
          )
        default:
          return null
      }
    },
    [t, formatDate, getRoleLabel]
  )

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('superadmin.users.error')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  const hasFiltersApplied = search || statusFilter !== 'active' || roleFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t('superadmin.users.filters.searchPlaceholder')}
          startContent={<Search className="text-default-400" size={16} />}
          value={search}
          onValueChange={handleSearchChange}
        />
        <Select
          aria-label={t('superadmin.users.filters.status')}
          className="w-full sm:w-40"
          items={statusFilterItems}
          value={statusFilter}
          onChange={handleStatusChange}
          variant="bordered"
        />
        <Select
          aria-label={t('superadmin.users.filters.role')}
          className="w-full sm:w-48"
          items={roleFilterItems}
          value={roleFilter}
          onChange={handleRoleChange}
          variant="bordered"
        />
        {hasFiltersApplied && (
          <Button startContent={<X size={14} />} variant="flat" onPress={handleClearFilters}>
            {t('superadmin.users.filters.clearFilters')}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <Users className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('superadmin.users.empty')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.users.emptyDescription')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TUserRow>
            aria-label={t('superadmin.users.title')}
            columns={tableColumns}
            rows={users}
            renderCell={renderCell}
            onRowClick={user => handleViewDetails(user.id)}
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
