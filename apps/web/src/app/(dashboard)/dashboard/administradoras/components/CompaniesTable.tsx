'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/table'
import { Input } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/dropdown'
import { Spinner } from '@heroui/spinner'
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
import { addToast } from '@heroui/toast'

type TStatusFilter = 'all' | 'active' | 'inactive'

// TODO: Remove dummy data - only for visualization
const USE_DUMMY_DATA = true

const createDummyCompany = (
  id: string,
  name: string,
  legalName: string,
  taxId: string,
  email: string,
  phone: string,
  address: string,
  website: string | null,
  isActive: boolean,
  createdAt: Date
): TManagementCompany => ({
  id,
  name,
  legalName,
  taxId,
  email,
  phone,
  address,
  website,
  isActive,
  createdAt,
  updatedAt: createdAt,
  locationId: null,
  logoUrl: null,
  metadata: null,
  createdBy: null,
})

const dummyCompanies: TManagementCompany[] = [
  createDummyCompany('1', 'Administradora Central', 'Administradora Central C.A.', 'J-12345678-9', 'contacto@admincentral.com', '+58 212 555 1234', 'Av. Principal, Torre Empresarial, Piso 5, Caracas', 'https://admincentral.com', true, new Date('2024-01-15')),
  createDummyCompany('2', 'Gestión Inmobiliaria del Este', 'Gestión Inmobiliaria del Este S.A.', 'J-98765432-1', 'info@gestioneste.com', '+58 212 555 5678', 'Calle Los Palos Grandes, Edificio Centro, Oficina 301', null, true, new Date('2024-02-20')),
  createDummyCompany('3', 'Servicios Condominiales Premium', 'Servicios Condominiales Premium C.A.', 'J-55667788-0', 'premium@servicond.com', '+58 212 555 9012', 'Av. Libertador, Centro Comercial Plaza, Local 15', 'https://servicond.com', false, new Date('2024-03-10')),
  createDummyCompany('4', 'Admin Pro Venezuela', 'Admin Pro Venezuela C.A.', 'J-11223344-5', 'contacto@adminpro.ve', '+58 212 555 3456', 'Urb. La Castellana, Calle 3, Qta. El Rosal', 'https://adminpro.ve', true, new Date('2024-04-05')),
  createDummyCompany('5', 'Condominios Unidos', 'Condominios Unidos S.R.L.', 'J-44556677-8', 'info@condounidos.com', '+58 212 555 7890', 'Av. Francisco de Miranda, Torre Delta, Piso 10', null, true, new Date('2024-05-12')),
  createDummyCompany('6', 'Gestión Habitacional del Norte', 'Gestión Habitacional del Norte C.A.', 'J-77889900-1', 'norte@gestionhab.com', '+58 212 555 2345', 'Av. Principal de Altamira, Edificio Norte, Piso 3', 'https://gestionhab.com', true, new Date('2024-06-18')),
  createDummyCompany('7', 'Administración Total', 'Administración Total C.A.', 'J-22334455-6', 'total@admintotal.com', '+58 212 555 6789', 'Calle Orinoco, Centro Empresarial, Oficina 205', null, false, new Date('2024-07-22')),
  createDummyCompany('8', 'Propiedades y Gestión', 'Propiedades y Gestión S.A.', 'J-66778899-2', 'info@propygestion.com', '+58 212 555 0123', 'Av. Urdaneta, Torre Financiera, Piso 8', 'https://propygestion.com', true, new Date('2024-08-30')),
  createDummyCompany('9', 'Inmobiliaria Caracas', 'Inmobiliaria Caracas C.A.', 'J-33445566-7', 'info@inmocaracas.com', '+58 212 555 4567', 'Av. Bolívar, Centro Plaza, Local 8', 'https://inmocaracas.com', true, new Date('2024-09-15')),
  createDummyCompany('10', 'Gestores Asociados', 'Gestores Asociados S.A.', 'J-88990011-3', 'contacto@gestores.com', '+58 212 555 8901', 'Calle Miranda, Edificio Sol, Piso 2', null, true, new Date('2024-10-01')),
  createDummyCompany('11', 'Administración Integral', 'Administración Integral C.A.', 'J-55443322-1', 'integral@admin.com', '+58 212 555 2345', 'Av. Las Acacias, Torre Norte, Oficina 405', 'https://adminintegral.com', true, new Date('2024-10-15')),
  createDummyCompany('12', 'Servicios Residenciales Pro', 'Servicios Residenciales Pro C.A.', 'J-11992288-4', 'pro@serviciosres.com', '+58 212 555 6789', 'Urb. El Rosal, Calle 5, Qta. Azul', null, false, new Date('2024-11-01')),
]

const columns = [
  { key: 'name', label: 'name' },
  { key: 'taxId', label: 'taxId' },
  { key: 'email', label: 'email' },
  { key: 'status', label: 'status' },
  { key: 'actions', label: 'actions' },
]

export function CompaniesTable() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user: firebaseUser } = useAuth()
  const queryClient = useQueryClient()
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
  const [limit, setLimit] = useState(USE_DUMMY_DATA ? 5 : 20)
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

  // Fetch data
  const { data, isLoading: apiLoading, error, refetch } = useManagementCompaniesPaginated({
    token,
    query,
    enabled: !!token && !USE_DUMMY_DATA,
  })

  // Use dummy data for visualization
  const filteredDummyData = useMemo(() => {
    if (!USE_DUMMY_DATA) return []
    let filtered = dummyCompanies

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.isActive === (statusFilter === 'active'))
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.taxId?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [search, statusFilter])

  const dummyPagination = useMemo(() => {
    const total = filteredDummyData.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const end = start + limit
    return {
      data: filteredDummyData.slice(start, end),
      pagination: { page, limit, total, totalPages }
    }
  }, [filteredDummyData, page, limit])

  const companies = USE_DUMMY_DATA ? dummyPagination.data : (data?.data ?? [])
  const pagination = USE_DUMMY_DATA ? dummyPagination.pagination : (data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 })
  const isLoading = USE_DUMMY_DATA ? false : apiLoading

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }, [])

  const handleStatusChange = useCallback((keys: Set<string>) => {
    const value = Array.from(keys)[0] as TStatusFilter
    if (value) {
      setStatusFilter(value)
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
        addToast({
          title: company.isActive
            ? t('superadmin.companies.actions.deactivateSuccess')
            : t('superadmin.companies.actions.activateSuccess'),
          color: 'success',
        })
      } catch {
        addToast({
          title: t('superadmin.companies.actions.toggleError'),
          color: 'danger',
        })
      } finally {
        setIsToggling(null)
      }
    },
    [token, queryClient, t]
  )

  const handleViewDetails = useCallback(
    (id: string) => {
      router.push(`/dashboard/administradoras/${id}`)
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
          return <span className="text-sm">{company.taxId || '-'}</span>
        case 'email':
          return <span className="text-sm">{company.email || '-'}</span>
        case 'status':
          return (
            <Chip
              color={company.isActive ? 'success' : 'default'}
              size="sm"
              variant="flat"
            >
              {company.isActive
                ? t('superadmin.companies.status.active')
                : t('superadmin.companies.status.inactive')}
            </Chip>
          )
        case 'actions':
          return (
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly size="sm" variant="light">
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
                  startContent={
                    isToggling === company.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <Power size={16} />
                    )
                  }
                  onPress={() => handleToggleActive(company)}
                >
                  {company.isActive
                    ? t('superadmin.companies.actions.deactivate')
                    : t('superadmin.companies.actions.activate')}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
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
        <Button className="mt-4" color="primary" size="sm" onPress={() => refetch()}>
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
          size="sm"
          startContent={<Search className="text-default-400" size={16} />}
          value={search}
          onValueChange={handleSearchChange}
        />
        <Select
          aria-label={t('superadmin.companies.filters.status')}
          className="w-full sm:w-40"
          selectedKeys={[statusFilter]}
          size="sm"
          variant="bordered"
          onSelectionChange={(keys) => handleStatusChange(keys as Set<string>)}
        >
          <SelectItem key="all">{t('superadmin.companies.status.all')}</SelectItem>
          <SelectItem key="active">{t('superadmin.companies.status.active')}</SelectItem>
          <SelectItem key="inactive">{t('superadmin.companies.status.inactive')}</SelectItem>
        </Select>
        {(search || statusFilter !== 'active') && (
          <Button
            size="sm"
            startContent={<X size={14} />}
            variant="flat"
            onPress={handleClearFilters}
          >
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
          <Table aria-label={t('superadmin.companies.title')}>
            <TableHeader>
              {columns.map((column) => (
                <TableColumn key={column.key}>
                  {t(`superadmin.companies.table.${column.label}`)}
                </TableColumn>
              ))}
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>{renderCell(company, column.key)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={USE_DUMMY_DATA ? [5, 10, 20, 50] : [10, 20, 50, 100]}
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
