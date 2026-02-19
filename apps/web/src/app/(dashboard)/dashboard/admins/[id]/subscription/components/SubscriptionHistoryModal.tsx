'use client'

import { useState, useCallback, useEffect } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Input } from '@/ui/components/input'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { Pagination } from '@/ui/components/pagination'
import { CreditCard, Calendar, DollarSign, History, Search, X } from 'lucide-react'
import { useTranslation } from '@/contexts'
import {
  useManagementCompanySubscriptionsPaginated,
  type ISubscriptionHistoryQuery,
} from '@packages/http-client'
import { formatCurrency } from '@packages/utils/currency'
import { formatShortDate } from '@packages/utils/dates'

interface SubscriptionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
}

const ITEMS_PER_PAGE = 5

export function SubscriptionHistoryModal({
  isOpen,
  onClose,
  companyId,
}: SubscriptionHistoryModalProps) {
  const { t } = useTranslation()

  // Filter states
  const [searchName, setSearchName] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchName)
      setCurrentPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchName])

  // Build query for API
  const query: ISubscriptionHistoryQuery = {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
    startDateFrom: startDateFilter || undefined,
    startDateTo: endDateFilter || undefined,
  }

  const { data, isLoading, isFetching } = useManagementCompanySubscriptionsPaginated(companyId, {
    query,
    enabled: !!companyId && isOpen,
  })

  const subscriptions = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 }

  const handleClearFilters = useCallback(() => {
    setSearchName('')
    setDebouncedSearch('')
    setStartDateFilter('')
    setEndDateFilter('')
    setCurrentPage(1)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchName(value)
  }, [])

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDateFilter(e.target.value)
    setCurrentPage(1)
  }, [])

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDateFilter(e.target.value)
    setCurrentPage(1)
  }, [])

  const formatDate = (date: Date | string) => formatShortDate(date)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'primary'
      case 'inactive':
        return 'default'
      case 'cancelled':
        return 'warning'
      case 'suspended':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    return t(`superadmin.companies.subscription.form.statuses.${status}`)
  }

  const getBillingCycleLabel = (cycle: string) => {
    return t(`superadmin.companies.subscription.form.billingCycles.${cycle}`)
  }

  const isActiveSubscription = (status: string) => {
    return status === 'active' || status === 'trial'
  }

  const hasActiveFilters = searchName || startDateFilter || endDateFilter

  // Get the correct translation based on count
  const getResultsCountText = (count: number) => {
    if (count === 1) {
      return t('superadmin.companies.subscription.history.resultCountSingular')
    }
    return t('superadmin.companies.subscription.history.resultCountPlural', { count })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent className="max-h-[90vh]">
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <History size={20} />
            {t('superadmin.companies.subscription.history.title')}
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4 pb-6">
          {/* Filters */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder={t('superadmin.companies.subscription.history.searchPlaceholder')}
                value={searchName}
                onValueChange={handleSearchChange}
                startContent={<Search size={16} className="text-default-400" />}
                className="flex-1"
                isClearable
                onClear={() => handleSearchChange('')}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">
                  {t('superadmin.companies.subscription.history.fromDate')}
                </label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={handleStartDateChange}
                  className="w-full rounded-md border border-default-200 bg-default-100 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">
                  {t('superadmin.companies.subscription.history.toDate')}
                </label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={handleEndDateChange}
                  className="w-full rounded-md border border-default-200 bg-default-100 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="flat"
                  color="danger"
                  startContent={<X size={16} />}
                  onPress={handleClearFilters}
                  className="sm:self-end"
                >
                  {t('superadmin.companies.subscription.history.clearFilters')}
                </Button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <Typography variant="caption" color="muted">
              {getResultsCountText(pagination.total)}
            </Typography>
            {isFetching && !isLoading && <Spinner size="sm" />}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && subscriptions.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
              <History className="mb-4 text-default-300" size={40} />
              <Typography color="muted" variant="body1">
                {hasActiveFilters
                  ? t('superadmin.companies.subscription.history.noResults')
                  : t('superadmin.companies.subscription.noHistory')}
              </Typography>
            </div>
          )}

          {/* Subscriptions list */}
          {!isLoading && subscriptions.length > 0 && (
            <div className="space-y-3">
              {subscriptions.map((subscription) => {
                const isActive = isActiveSubscription(subscription.status)

                return (
                  <Card
                    key={subscription.id}
                    className={`transition-all ${
                      isActive
                        ? 'border-2 border-primary bg-primary-50/30 shadow-md'
                        : 'border border-default-200'
                    }`}
                  >
                    <CardBody className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Left side: Name and info */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              isActive ? 'bg-primary-100' : 'bg-default-100'
                            }`}
                          >
                            <CreditCard
                              className={isActive ? 'text-primary' : 'text-default-500'}
                              size={20}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Typography variant="subtitle2">
                                {subscription.subscriptionName || 'Plan Personalizado'}
                              </Typography>
                              <Chip
                                color={getStatusColor(subscription.status)}
                                size="sm"
                                variant={isActive ? 'solid' : 'flat'}
                              >
                                {getStatusLabel(subscription.status)}
                              </Chip>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-default-500">
                              <span className="flex items-center gap-1">
                                <DollarSign size={14} />
                                {formatCurrency(Number(subscription.basePrice))}
                              </span>
                              <span>{getBillingCycleLabel(subscription.billingCycle)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: Dates */}
                        <div className="flex flex-col gap-1 text-right text-sm">
                          <div className="flex items-center justify-end gap-1 text-default-500">
                            <Calendar size={14} />
                            <span>
                              {t('superadmin.companies.subscription.history.startDate')}:{' '}
                              {formatDate(subscription.startDate)}
                            </span>
                          </div>
                          {subscription.cancelledAt && (
                            <div className="text-warning">
                              {t('superadmin.companies.subscription.history.cancelledAt')}:{' '}
                              {formatDate(subscription.cancelledAt)}
                            </div>
                          )}
                          {subscription.endDate && !subscription.cancelledAt && (
                            <div className="text-default-400">
                              {t('superadmin.companies.subscription.history.endDate')}:{' '}
                              {formatDate(subscription.endDate)}
                            </div>
                          )}
                          {isActive && subscription.nextBillingDate && (
                            <div className="text-primary">
                              {t('superadmin.companies.subscription.history.nextBilling')}:{' '}
                              {formatDate(subscription.nextBillingDate)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cancellation reason if cancelled */}
                      {subscription.status === 'cancelled' && subscription.cancellationReason && (
                        <div className="mt-3 rounded-lg bg-warning-50 p-2 text-sm">
                          <span className="font-medium text-warning-700">
                            {t('superadmin.companies.subscription.history.reason')}:{' '}
                          </span>
                          <span className="text-warning-600">{subscription.cancellationReason}</span>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && pagination.totalPages > 1 && (
            <div className="pt-4">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={handlePageChange}
                showLimitSelector={false}
              />
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
