'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Spinner } from '@/ui/components/spinner'
import { Tooltip } from '@/ui/components/tooltip'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { User, Plus, Crown, Search, X, Info } from 'lucide-react'
import { Avatar } from '@/ui/components/avatar-base'
import type { TManagementCompanyMembersQuery } from '@packages/domain'

import {
  useManagementCompanyMembersPaginated,
  managementCompanyMemberKeys,
  useQueryClient,
  useCanCreateResource,
} from '@packages/http-client'
import { useAuth } from '@/contexts'
import { AddMemberModal } from './AddMemberModal'

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

interface CompanyMembersTableProps {
  companyId: string
  isCompanyActive: boolean
}

function getMemberDisplayName(user: TMemberRow['user']): string {
  if (!user) return 'Sin nombre'
  if (user.displayName) return user.displayName
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ')
  }
  return 'Sin nombre'
}

export function CompanyMembersTable({ companyId, isCompanyActive }: CompanyMembersTableProps) {
  const queryClient = useQueryClient()
  const { user: firebaseUser } = useAuth()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [token, setToken] = useState<string>('')

  // Get Firebase token
  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Check if can add member based on subscription limits
  const {
    data: canCreateData,
    isLoading: isCheckingLimit,
    error: canCreateError,
  } = useCanCreateResource({
    token,
    managementCompanyId: companyId,
    resourceType: 'user',
    enabled: !!token && !!companyId,
  })

  const canAddMember = canCreateData?.data?.canCreate ?? false
  const limitInfo = canCreateData?.data
  const hasNoSubscription = !!canCreateError

  // Filter state
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<TRoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')
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

  // Build query for API
  const query: TManagementCompanyMembersQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      roleName: roleFilter === 'all' ? undefined : roleFilter,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
    [page, limit, debouncedSearch, roleFilter, statusFilter]
  )

  // Role filter items
  const roleFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: 'Todos los roles' },
      { key: 'admin', label: 'Administrador' },
      { key: 'accountant', label: 'Contador' },
      { key: 'support', label: 'Soporte' },
      { key: 'viewer', label: 'Visualizador' },
    ],
    []
  )

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: 'Todos' },
      { key: 'active', label: 'Activos' },
      { key: 'inactive', label: 'Inactivos' },
    ],
    []
  )

  // Table columns
  const tableColumns: ITableColumn<TMemberRow>[] = useMemo(
    () => [
      { key: 'member', label: 'MIEMBRO' },
      { key: 'roleName', label: 'ROL' },
      { key: 'joinedAt', label: 'FECHA DE INGRESO' },
      { key: 'status', label: 'ESTADO' },
    ],
    []
  )

  // Fetch data from API with pagination
  const { data, isLoading, error, refetch } = useManagementCompanyMembersPaginated({
    companyId,
    query,
    enabled: !!companyId,
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

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setDebouncedSearch('')
    setRoleFilter('all')
    setStatusFilter('active')
    setPage(1)
  }, [])

  const handleAddMemberSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: managementCompanyMemberKeys.all })
  }, [queryClient])

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
      admin: 'Administrador',
      accountant: 'Contador',
      support: 'Soporte',
      viewer: 'Visualizador',
    }
    return labels[role.toLowerCase()] || role
  }

  const renderCell = useCallback((member: TMemberRow, columnKey: keyof TMemberRow | string) => {
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
            {member.isActive ? 'Activo' : 'Inactivo'}
          </Chip>
        )
      default:
        return null
    }
  }, [])

  const hasActiveFilters = searchInput || roleFilter !== 'all' || statusFilter !== 'active'

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          Error al cargar los miembros
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Input
              className="w-full sm:max-w-xs"
              placeholder="Buscar por nombre o correo..."
              startContent={<Search className="text-default-400" size={16} />}
              value={searchInput}
              onValueChange={handleSearchChange}
            />
            <Select
              aria-label="Filtrar por rol"
              className="w-full sm:w-52"
              items={roleFilterItems}
              value={roleFilter}
              onChange={handleRoleChange}
              variant="bordered"
            />
            <Select
              aria-label="Filtrar por estado"
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
          {isCompanyActive && (
            <div className="flex items-center gap-2">
              <Button
                color="primary"
                startContent={<Plus size={16} />}
                onPress={() => setIsAddModalOpen(true)}
                isLoading={isCheckingLimit}
                isDisabled={isCheckingLimit || !canAddMember || hasNoSubscription}
              >
                Agregar Miembro
              </Button>
              {(isCheckingLimit || !canAddMember || hasNoSubscription) && !isCheckingLimit && (
                <Tooltip
                  content={
                    <div className="max-w-xs">
                      {hasNoSubscription
                        ? 'No hay una suscripción activa para esta administradora'
                        : !canAddMember && limitInfo?.limitReached
                          ? `Límite alcanzado: ${limitInfo.currentCount} de ${limitInfo.maxAllowed ?? 'ilimitados'} miembros`
                          : 'No se pueden agregar miembros en este momento'}
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
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
            <User className="mb-4 text-default-300" size={48} />
            <Typography color="muted" variant="body1">
              {hasActiveFilters ? 'No se encontraron resultados' : 'No hay miembros'}
            </Typography>
            <Typography className="mt-1" color="muted" variant="body2">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Esta administradora aún no tiene miembros registrados'}
            </Typography>
          </div>
        ) : (
          <>
            <Table<TMemberRow>
              aria-label="Tabla de miembros"
              columns={tableColumns}
              rows={members}
              renderCell={renderCell}
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

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        companyId={companyId}
        onSuccess={handleAddMemberSuccess}
      />
    </>
  )
}
