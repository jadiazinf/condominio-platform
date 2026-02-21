'use client'

import { useState, useMemo, useCallback } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { Typography } from '@/ui/components/typography'
import { useDisclosure } from '@/ui/components/modal'
import { CreditCard, Plus, X } from 'lucide-react'
import { useTranslation } from '@/contexts'
import type { TBankAccount, TBankAccountsQuery } from '@packages/domain'

import {
  useMyCompanyBankAccountsPaginated,
  useCompanyCondominiumsPaginated,
} from '@packages/http-client'

import { CreateBankAccountWizard } from './CreateBankAccountWizard'
import { BankAccountDetailModal } from './BankAccountDetailModal'

type TCategoryFilter = 'all' | 'national' | 'international'
type TStatusFilter = 'all' | 'active' | 'inactive'

interface BankAccountsPageProps {
  managementCompanyId: string
  memberRole: string | null
}

export function BankAccountsPage({ managementCompanyId, memberRole }: BankAccountsPageProps) {
  const { t } = useTranslation()
  const isAdmin = memberRole === 'admin'

  // Modal state
  const createModal = useDisclosure()
  const detailModal = useDisclosure()
  const [selectedAccount, setSelectedAccount] = useState<TBankAccount | null>(null)

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<TCategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('active')
  const [condominiumFilter, setCondominiumFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Fetch condominiums for filter dropdown
  const { data: condominiumsData } = useCompanyCondominiumsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 100 },
    enabled: !!managementCompanyId,
  })

  const condominiums = condominiumsData?.data ?? []

  // Build query for API
  const query: TBankAccountsQuery = useMemo(
    () => ({
      page,
      limit,
      accountCategory: categoryFilter === 'all' ? undefined : categoryFilter,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      condominiumId: condominiumFilter === 'all' ? undefined : condominiumFilter,
    }),
    [page, limit, categoryFilter, statusFilter, condominiumFilter]
  )

  // Category filter items
  const categoryFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.company.myCompany.bankAccounts.allCategories') },
      { key: 'national', label: t('admin.company.myCompany.bankAccounts.national') },
      { key: 'international', label: t('admin.company.myCompany.bankAccounts.international') },
    ],
    [t]
  )

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.company.myCompany.bankAccounts.allStatuses') },
      { key: 'active', label: t('admin.company.myCompany.bankAccounts.active') },
      { key: 'inactive', label: t('admin.company.myCompany.bankAccounts.inactive') },
    ],
    [t]
  )

  // Condominium filter items
  const condominiumFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('admin.company.myCompany.bankAccounts.allCondominiums') },
      ...condominiums.map(c => ({ key: c.id, label: c.name })),
    ],
    [condominiums, t]
  )

  // Table columns
  const tableColumns: ITableColumn<TBankAccount>[] = useMemo(
    () => [
      { key: 'displayName', label: t('admin.company.myCompany.bankAccounts.columns.displayName') },
      { key: 'bankName', label: t('admin.company.myCompany.bankAccounts.columns.bankName') },
      { key: 'accountCategory', label: t('admin.company.myCompany.bankAccounts.columns.category') },
      { key: 'currency', label: t('admin.company.myCompany.bankAccounts.columns.currency') },
      { key: 'condominiums', label: t('admin.company.myCompany.bankAccounts.columns.condominiums') },
      { key: 'isActive', label: t('admin.company.myCompany.bankAccounts.columns.status') },
      { key: 'createdAt', label: t('admin.company.myCompany.bankAccounts.columns.createdAt') },
    ],
    [t]
  )

  // Fetch data
  const { data, isLoading, error, refetch } = useMyCompanyBankAccountsPaginated({
    companyId: managementCompanyId,
    query,
    enabled: !!managementCompanyId,
  })

  const bankAccounts = (data?.data ?? []) as TBankAccount[]
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  // Handlers
  const handleCategoryChange = useCallback((key: string | null) => {
    if (key) {
      setCategoryFilter(key as TCategoryFilter)
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
    setCategoryFilter('all')
    setStatusFilter('active')
    setCondominiumFilter('all')
    setPage(1)
  }, [])

  const handleRowClick = useCallback(
    (account: TBankAccount) => {
      setSelectedAccount(account)
      detailModal.onOpen()
    },
    [detailModal]
  )

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderCell = useCallback(
    (account: TBankAccount, columnKey: string) => {
      switch (columnKey) {
        case 'displayName':
          return (
            <div className="flex items-center gap-3">
              <CreditCard className="text-default-400 shrink-0" size={20} />
              <p className="text-sm font-medium">{account.displayName}</p>
            </div>
          )
        case 'bankName':
          return <p className="text-sm text-default-600">{account.bankName}</p>
        case 'accountCategory':
          return (
            <Chip
              color={account.accountCategory === 'national' ? 'primary' : 'secondary'}
              variant="flat"
            >
              {account.accountCategory === 'national'
                ? t('admin.company.myCompany.bankAccounts.national')
                : t('admin.company.myCompany.bankAccounts.international')}
            </Chip>
          )
        case 'currency':
          return <p className="text-sm font-mono">{account.currency}</p>
        case 'condominiums':
          return account.appliesToAllCondominiums ? (
            <Chip color="success" variant="flat">
              {t('admin.company.myCompany.bankAccounts.allCondominiumsBadge')}
            </Chip>
          ) : (
            <p className="text-sm text-default-600">
              {(account as TBankAccount & { condominiumIds?: string[] }).condominiumIds?.length ?? 0}
            </p>
          )
        case 'isActive':
          return (
            <Chip color={account.isActive ? 'success' : 'default'} variant="dot">
              {account.isActive
                ? t('admin.company.myCompany.bankAccounts.active')
                : t('admin.company.myCompany.bankAccounts.inactive')}
            </Chip>
          )
        case 'createdAt':
          return (
            <p className="text-sm text-default-600">
              {account.createdAt ? formatDate(account.createdAt) : '-'}
            </p>
          )
        default:
          return null
      }
    },
    [t]
  )

  const hasActiveFilters =
    categoryFilter !== 'all' || statusFilter !== 'active' || condominiumFilter !== 'all'

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('admin.company.myCompany.bankAccounts.error')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('admin.company.myCompany.bankAccounts.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">
            {t('admin.company.myCompany.bankAccounts.title')}
          </Typography>
          <Typography color="muted" variant="body2" className="mt-1">
            {t('admin.company.myCompany.bankAccounts.subtitle')}
          </Typography>
        </div>
        {isAdmin && (
          <Button color="primary" startContent={<Plus size={16} />} onPress={createModal.onOpen}>
            {t('admin.company.myCompany.bankAccounts.addBankAccount')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <Select
          aria-label={t('admin.company.myCompany.bankAccounts.filterCategory')}
          className="w-full sm:w-44"
          items={categoryFilterItems}
          value={categoryFilter}
          onChange={handleCategoryChange}
          variant="bordered"
        />
        <Select
          aria-label={t('admin.company.myCompany.bankAccounts.filterStatus')}
          className="w-full sm:w-36"
          items={statusFilterItems}
          value={statusFilter}
          onChange={handleStatusChange}
          variant="bordered"
        />
        {condominiums.length > 0 && (
          <Select
            aria-label={t('admin.company.myCompany.bankAccounts.filterCondominium')}
            className="w-full sm:w-56"
            items={condominiumFilterItems}
            value={condominiumFilter}
            onChange={handleCondominiumChange}
            variant="bordered"
          />
        )}
        {hasActiveFilters && (
          <Button startContent={<X size={14} />} variant="flat" onPress={handleClearFilters}>
            {t('admin.company.myCompany.bankAccounts.clear')}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <CreditCard className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {hasActiveFilters
              ? t('admin.company.myCompany.bankAccounts.noResults')
              : t('admin.company.myCompany.bankAccounts.noBankAccounts')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {hasActiveFilters
              ? t('admin.company.myCompany.bankAccounts.noResultsHint')
              : t('admin.company.myCompany.bankAccounts.noBankAccountsHint')}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TBankAccount>
            aria-label={t('admin.company.myCompany.bankAccounts.title')}
            columns={tableColumns}
            rows={bankAccounts}
            renderCell={renderCell}
            onRowClick={handleRowClick}
            classNames={{
              tr: 'cursor-pointer hover:bg-default-100 transition-colors',
            }}
          />

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

      {/* Create Wizard Modal */}
      {isAdmin && (
        <CreateBankAccountWizard
          isOpen={createModal.isOpen}
          onClose={createModal.onClose}
          managementCompanyId={managementCompanyId}
        />
      )}

      {/* Detail Modal */}
      {selectedAccount && (
        <BankAccountDetailModal
          isOpen={detailModal.isOpen}
          onClose={() => {
            detailModal.onClose()
            setSelectedAccount(null)
          }}
          bankAccount={selectedAccount}
          managementCompanyId={managementCompanyId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
