'use client'

import { useState, useMemo, useCallback } from 'react'
import { CreditCard, Search, X } from 'lucide-react'

import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Spinner } from '@/ui/components/spinner'
import { useTranslation } from '@/contexts'
import { useAuth } from '@/contexts'
import { getMyCompanySubscriptionsPaginated, useQuery } from '@packages/http-client'
import type { TApiPaginationMeta } from '@packages/http-client'
import type { TManagementCompanySubscription } from '@packages/domain'
import { SubscriptionDetailModal } from '../../components/SubscriptionDetailModal'

const statusColorMap: Record<string, 'success' | 'primary' | 'default' | 'warning' | 'danger'> = {
  active: 'success',
  trial: 'primary',
  inactive: 'default',
  cancelled: 'warning',
  suspended: 'danger',
}

function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '$0.00'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(num)
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-'
  return new Intl.DateTimeFormat('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

const billingCycleLabels: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semi_annual: 'Semestral',
  annual: 'Anual',
  custom: 'Personalizado',
}

interface SubscriptionHistoryPageProps {
  companyId: string
}

export function SubscriptionHistoryPage({ companyId }: SubscriptionHistoryPageProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const tp = 'admin.subscription.history'

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedSubscription, setSelectedSubscription] =
    useState<TManagementCompanySubscription | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['myCompanySubscriptions', companyId, page, limit, search, dateFrom, dateTo],
    queryFn: async () => {
      const token = await user?.getIdToken()
      if (!token) throw new Error('No token')
      return getMyCompanySubscriptionsPaginated(token, companyId, {
        page,
        limit,
        search: search || undefined,
        startDateFrom: dateFrom || undefined,
        startDateTo: dateTo || undefined,
      })
    },
    enabled: !!user,
  })

  const subscriptions: TManagementCompanySubscription[] = data?.data ?? []
  const pagination: TApiPaginationMeta = data?.pagination ?? {
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(typeof e === 'string' ? e : (e?.target as HTMLInputElement)?.value ?? '')
    setPage(1)
  }, [])

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(typeof e === 'string' ? e : (e?.target as HTMLInputElement)?.value ?? '')
    setPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }, [])

  const handleRowClick = useCallback((sub: TManagementCompanySubscription) => {
    setSelectedSubscription(sub)
  }, [])

  const hasActiveFilters = search || dateFrom || dateTo

  const tableColumns: ITableColumn<TManagementCompanySubscription>[] = useMemo(
    () => [
      { key: 'subscriptionName', label: t(`${tp}.columns.plan`) },
      { key: 'status', label: t(`${tp}.columns.status`) },
      { key: 'basePrice', label: t(`${tp}.columns.price`) },
      { key: 'startDate', label: t(`${tp}.columns.startDate`) },
      { key: 'cancelledAt', label: t(`${tp}.columns.cancelledAt`) },
    ],
    [t, tp]
  )

  const renderCell = useCallback(
    (sub: TManagementCompanySubscription, columnKey: keyof TManagementCompanySubscription | string) => {
      switch (columnKey) {
        case 'subscriptionName':
          return (
            <p className="text-sm font-medium">
              {sub.subscriptionName || 'Plan'}
            </p>
          )
        case 'status':
          return (
            <Chip
              color={statusColorMap[sub.status] || 'default'}
              variant="flat"
              size="sm"
            >
              {t(`admin.subscription.status.${sub.status}`)}
            </Chip>
          )
        case 'basePrice':
          return (
            <p className="text-sm text-default-600">
              {formatCurrency(sub.basePrice)} / {billingCycleLabels[sub.billingCycle] || sub.billingCycle}
            </p>
          )
        case 'startDate':
          return (
            <p className="text-sm text-default-600">
              {formatDate(sub.startDate)}
            </p>
          )
        case 'cancelledAt':
          return sub.cancelledAt ? (
            <p className="text-sm text-warning">
              {formatDate(sub.cancelledAt)}
            </p>
          ) : (
            <p className="text-sm text-default-400">-</p>
          )
        default:
          return null
      }
    },
    [t]
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Typography variant="h3">{t(`${tp}.title`)}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t(`${tp}.subtitle`)}
        </Typography>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t(`${tp}.searchPlaceholder`)}
          startContent={<Search className="text-default-400" size={16} />}
          value={search}
          onValueChange={handleSearchChange}
        />
        <Input
          type="date"
          label={t(`${tp}.dateFrom`)}
          className="w-full sm:w-44"
          value={dateFrom}
          onChange={handleDateFromChange}
        />
        <Input
          type="date"
          label={t(`${tp}.dateTo`)}
          className="w-full sm:w-44"
          value={dateTo}
          onChange={handleDateToChange}
        />
        {hasActiveFilters && (
          <Button startContent={<X size={14} />} variant="flat" onPress={handleClearFilters}>
            {t(`${tp}.clear`)}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
          <CreditCard className="mb-4 text-default-300" size={48} />
          <Typography color="muted" variant="body1">
            {t(`${tp}.empty`)}
          </Typography>
          <Typography color="muted" variant="body2" className="mt-1">
            {t(`${tp}.emptyDescription`)}
          </Typography>
        </div>
      ) : (
        <>
          <Table<TManagementCompanySubscription>
            aria-label={t(`${tp}.title`)}
            columns={tableColumns}
            rows={subscriptions}
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

      {/* Detail Modal */}
      <SubscriptionDetailModal
        subscription={selectedSubscription}
        isOpen={!!selectedSubscription}
        onClose={() => setSelectedSubscription(null)}
      />
    </div>
  )
}
