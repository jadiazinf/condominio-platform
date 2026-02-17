'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/ui/components/dropdown'
import { Spinner } from '@/ui/components/spinner'
import { ClearFiltersButton } from '@/ui/components/filters'
import { ScrollText, MoreVertical, Plus, Power, Pencil } from 'lucide-react'
import type { TSubscriptionTermsConditions } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import {
  useSubscriptionTermsList,
  useDeactivateSubscriptionTerms,
  subscriptionTermsKeys,
  useQueryClient,
} from '@packages/http-client'
import { useToast } from '@/ui/components/toast'

type TStatusFilter = 'all' | 'active' | 'inactive'

type TTermsRow = TSubscriptionTermsConditions & { id: string }

export function TermsTable() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('all')

  const queryParams = useMemo(() => {
    const params: { isActive?: boolean } = {}
    if (statusFilter === 'active') params.isActive = true
    else if (statusFilter === 'inactive') params.isActive = false
    return params
  }, [statusFilter])

  const { data, isLoading, error, refetch } = useSubscriptionTermsList({
    query: queryParams,
  })

  const terms = data?.data ?? []

  const deactivateMutation = useDeactivateSubscriptionTerms({
    onSuccess: () => {
      toast.success(t('superadmin.terms.deactivate.success'))
      queryClient.invalidateQueries({ queryKey: subscriptionTermsKeys.all })
    },
    onError: () => {
      toast.error(t('superadmin.terms.deactivate.error'))
    },
  })

  const isDeactivating = deactivateMutation.isPending

  const formatDate = (date: Date | string | null) => {
    if (!date) return '—'
    const d = new Date(date)
    return d.toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: t('superadmin.terms.filters.all') },
      { key: 'active', label: t('superadmin.terms.filters.active') },
      { key: 'inactive', label: t('superadmin.terms.filters.inactive') },
    ],
    [t]
  )

  const tableColumns: ITableColumn<TTermsRow>[] = useMemo(
    () => [
      { key: 'version', label: t('superadmin.terms.table.version') },
      { key: 'title', label: t('superadmin.terms.table.title') },
      { key: 'effectiveFrom', label: t('superadmin.terms.table.effectiveFrom') },
      { key: 'effectiveUntil', label: t('superadmin.terms.table.effectiveUntil') },
      { key: 'status', label: t('superadmin.terms.table.status') },
      { key: 'actions', label: t('superadmin.terms.table.actions') },
    ],
    [t]
  )

  const handleStatusChange = useCallback((key: string | null) => {
    if (key) setStatusFilter(key as TStatusFilter)
  }, [])

  const handleClearFilters = useCallback(() => {
    setStatusFilter('all')
  }, [])

  const handleDeactivate = useCallback(
    (term: TSubscriptionTermsConditions) => {
      deactivateMutation.mutate({ id: term.id })
    },
    [deactivateMutation]
  )

  const renderCell = useCallback(
    (term: TSubscriptionTermsConditions, columnKey: string) => {
      switch (columnKey) {
        case 'version':
          return <span className="font-mono font-semibold">{term.version}</span>
        case 'title':
          return <span>{term.title}</span>
        case 'effectiveFrom':
          return <span className="text-sm">{formatDate(term.effectiveFrom)}</span>
        case 'effectiveUntil':
          return <span className="text-sm">{formatDate(term.effectiveUntil)}</span>
        case 'status':
          return (
            <Chip color={term.isActive ? 'success' : 'default'} variant="flat">
              {term.isActive
                ? t('superadmin.terms.table.active')
                : t('superadmin.terms.table.inactive')}
            </Chip>
          )
        case 'actions':
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly variant="light">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Actions">
                  <DropdownItem
                    key="edit"
                    startContent={<Pencil size={16} />}
                    onPress={() => router.push(`/dashboard/terms-conditions/${term.id}`)}
                  >
                    {t('superadmin.terms.table.edit')}
                  </DropdownItem>
                  {term.isActive ? (
                    <DropdownItem
                      key="deactivate"
                      color="warning"
                      isDisabled={isDeactivating}
                      startContent={isDeactivating ? <Spinner size="sm" /> : <Power size={16} />}
                      onPress={() => handleDeactivate(term)}
                    >
                      {t('superadmin.terms.deactivate.title')}
                    </DropdownItem>
                  ) : (
                    <DropdownItem
                      key="inactive-label"
                      isDisabled
                      startContent={<Power size={16} />}
                    >
                      {t('superadmin.terms.table.inactive')}
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
            </div>
          )
        default:
          return null
      }
    },
    [t, router, handleDeactivate, isDeactivating]
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          {t('common.loadError')}
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters + Create Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            aria-label={t('superadmin.terms.table.status')}
            className="w-full sm:w-40"
            items={statusFilterItems}
            value={statusFilter}
            onChange={handleStatusChange}
            variant="bordered"
          />
          {statusFilter !== 'all' && (
            <ClearFiltersButton onClear={handleClearFilters} />
          )}
        </div>
        <Button
          color="primary"
          href="/dashboard/terms-conditions/create"
          startContent={<Plus size={18} />}
        >
          {t('superadmin.terms.create.button')}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : terms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <ScrollText className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t('superadmin.terms.table.noTerms')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.terms.table.noTermsDescription')}
          </Typography>
        </div>
      ) : (
        <Table<TTermsRow>
          aria-label={t('superadmin.terms.title')}
          columns={tableColumns}
          rows={terms}
          renderCell={renderCell}
        />
      )}
    </div>
  )
}
