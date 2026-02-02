'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Input } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Users, Search, X, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useTranslation, useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import {
  useSuperadminUsersPaginated,
  type TSuperadminUserWithDetails,
  type TSuperadminUsersQuery,
} from '@packages/http-client/hooks'
import { Avatar } from '@/ui/components/avatar-base'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TSuperadminUserRow = TSuperadminUserWithDetails & { id: string }

export function SuperadminUsersTable() {
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
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Build query
  const query: TSuperadminUsersQuery = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
    [page, limit, search, statusFilter]
  )

  // Fetch data from API
  const { data, isLoading, error, refetch } = useSuperadminUsersPaginated({
    token,
    query,
    enabled: !!token,
  })

  const superadminUsers = data?.data ?? []
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

  // Table columns
  const tableColumns: ITableColumn<TSuperadminUserRow>[] = useMemo(
    () => [
      { key: 'user', label: t('superadmin.users.table.user') },
      { key: 'email', label: t('superadmin.users.table.email') },
      { key: 'document', label: t('superadmin.users.table.document') },
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

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('active')
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
    (superadminUser: TSuperadminUserWithDetails, columnKey: string | number | symbol) => {
      switch (String(columnKey)) {
        case 'user':
          return (
            <div className="flex items-center gap-3">
              <Avatar
                name={
                  superadminUser.user.firstName && superadminUser.user.lastName
                    ? `${superadminUser.user.firstName} ${superadminUser.user.lastName}`
                    : superadminUser.user.displayName || superadminUser.user.email
                }
                size="sm"
                src={superadminUser.user.photoUrl || undefined}
              />
              <div className="flex flex-col">
                <span className="font-medium">
                  {superadminUser.user.firstName && superadminUser.user.lastName
                    ? `${superadminUser.user.firstName} ${superadminUser.user.lastName}`
                    : superadminUser.user.displayName || '-'}
                </span>
                {superadminUser.notes && (
                  <span className="text-xs text-default-500">{superadminUser.notes}</span>
                )}
              </div>
            </div>
          )
        case 'email':
          return <span className="text-sm">{superadminUser.user.email}</span>
        case 'document':
          return (
            <span className="text-sm">
              {superadminUser.user.idDocumentType && superadminUser.user.idDocumentNumber
                ? `${superadminUser.user.idDocumentType}-${superadminUser.user.idDocumentNumber}`
                : '-'}
            </span>
          )
        case 'status':
          return (
            <Chip color={superadminUser.isActive ? 'success' : 'default'} variant="flat">
              {superadminUser.isActive
                ? t('superadmin.users.status.active')
                : t('superadmin.users.status.inactive')}
            </Chip>
          )
        case 'lastAccess':
          return (
            <span className="text-sm text-default-500">
              {formatDate(superadminUser.user.lastLogin)}
            </span>
          )
        default:
          return null
      }
    },
    [t, formatDate]
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
        {(search || statusFilter !== 'active') && (
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
      ) : superadminUsers.length === 0 ? (
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
          <Table<TSuperadminUserRow>
            aria-label={t('superadmin.users.title')}
            columns={tableColumns}
            rows={superadminUsers}
            renderCell={renderCell}
            onRowClick={superadminUser => handleViewDetails(superadminUser.id)}
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
