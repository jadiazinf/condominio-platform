'use client'

import { useState, useCallback } from 'react'
import { History, CreditCard, Search } from 'lucide-react'

import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { Pagination } from '@/ui/components/pagination'
import { Input } from '@/ui/components/input'
import { Spinner } from '@/ui/components/spinner'
import { useTranslation } from '@/contexts'
import { useAuth } from '@/contexts'
import { getMyCompanySubscriptionsPaginated, useQuery } from '@packages/http-client'
import type { TApiPaginationMeta } from '@packages/http-client'
import type { TManagementCompanySubscription } from '@packages/domain'
import { formatCurrency } from '@packages/utils/currency'
import { formatFullDate } from '@packages/utils/dates'
import { SubscriptionDetailModal } from './SubscriptionDetailModal'

const statusColorMap: Record<string, 'success' | 'primary' | 'default' | 'warning' | 'danger'> = {
  active: 'success',
  trial: 'primary',
  inactive: 'default',
  cancelled: 'warning',
  suspended: 'danger',
}

const billingCycleLabels: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semi_annual: 'Semestral',
  annual: 'Anual',
  custom: 'Personalizado',
}

interface AdminSubscriptionHistoryProps {
  companyId: string
}

export function AdminSubscriptionHistory({ companyId }: AdminSubscriptionHistoryProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const tp = 'admin.subscription.history'

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedSubscription, setSelectedSubscription] = useState<TManagementCompanySubscription | null>(null)

  const limit = 5

  const { data, isLoading } = useQuery({
    queryKey: ['myCompanySubscriptions', companyId, page, search],
    queryFn: async () => {
      const token = await user?.getIdToken()
      if (!token) throw new Error('No token')
      return getMyCompanySubscriptionsPaginated(token, companyId, {
        page,
        limit,
        search: search || undefined,
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

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="text-default-500" size={20} />
        <Typography variant="h3" className="text-lg">
          {t(`${tp}.title`)}
        </Typography>
      </div>

      {/* Search */}
      <Input
        className="w-full sm:max-w-xs"
        placeholder={t(`${tp}.searchPlaceholder`)}
        startContent={<Search className="text-default-400" size={16} />}
        value={search}
        onValueChange={handleSearchChange}
      />

      {/* Results count */}
      <Typography color="muted" variant="body2">
        {t(`${tp}.count`, {
          filtered: pagination.total,
          total: pagination.total,
        })}
      </Typography>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {/* Empty */}
      {!isLoading && subscriptions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
          <CreditCard className="mb-4 text-default-300" size={40} />
          <Typography color="muted" variant="body1">
            {t(`${tp}.empty`)}
          </Typography>
          <Typography color="muted" variant="body2" className="mt-1">
            {t(`${tp}.emptyDescription`)}
          </Typography>
        </div>
      )}

      {/* Subscription List */}
      {!isLoading && subscriptions.length > 0 && (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <Card
              key={sub.id}
              className="cursor-pointer transition-all hover:shadow-md"
              isPressable
              onPress={() => setSelectedSubscription(sub)}
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Typography variant="body1" className="font-medium truncate">
                        {sub.subscriptionName || 'Plan'}
                      </Typography>
                      <Chip
                        color={statusColorMap[sub.status] || 'default'}
                        variant="flat"
                        size="sm"
                      >
                        {t(`admin.subscription.status.${sub.status}`)}
                      </Chip>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-default-500">
                      <span>{formatCurrency(sub.basePrice)} / {billingCycleLabels[sub.billingCycle] || sub.billingCycle}</span>
                      <span>{t(`${tp}.startedAt`)}: {formatFullDate(sub.startDate)}</span>
                      {sub.cancelledAt && (
                        <span className="text-warning">{t(`${tp}.cancelledAt`)}: {formatFullDate(sub.cancelledAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}

          {/* Pagination */}
          <Pagination
            className="mt-4"
            limit={pagination.limit}
            limitOptions={[5, 10, 20]}
            page={pagination.page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
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
