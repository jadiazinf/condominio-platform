'use client'

import type {
  TManagementCompany,
  TManagementCompaniesQuery,
  TPaginationMeta,
} from '@packages/domain'

import { NoSubscriptionTable } from './NoSubscriptionTable'

import { useTranslation } from '@/contexts'

interface NoSubscriptionPageClientProps {
  companies: TManagementCompany[]
  pagination: TPaginationMeta
  initialQuery: TManagementCompaniesQuery
}

export function NoSubscriptionPageClient({
  companies,
  pagination,
  initialQuery,
}: NoSubscriptionPageClientProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-default-900">
          {t('superadmin.noSubscription.title')}
        </h1>
        <p className="mt-2 text-sm text-default-500">{t('superadmin.noSubscription.subtitle')}</p>
      </div>

      <NoSubscriptionTable
        companies={companies}
        initialQuery={initialQuery}
        pagination={pagination}
      />
    </div>
  )
}
