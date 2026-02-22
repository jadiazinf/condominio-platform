import type { TQuota } from '@packages/domain'
import { getHttpClient } from '@packages/http-client'
import type { TApiDataResponse } from '@packages/http-client'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { QuotasTable } from './components/QuotasTable'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getQuotasForCondominium(token: string, condominiumId: string, managementCompanyId?: string): Promise<TQuota[]> {
  const client = getHttpClient()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'x-condominium-id': condominiumId,
  }
  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }
  const response = await client.get<TApiDataResponse<TQuota[]>>('/condominium/quotas', { headers })
  return response.data.data
}

export default async function CondominiumQuotasPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token, session] = await Promise.all([getTranslations(), getServerAuthToken(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId ?? ''
    : ''

  let quotas: TQuota[] = []
  try {
    quotas = await getQuotasForCondominium(token, id, managementCompanyId)
  } catch (error) {
    console.error('Failed to fetch quotas:', error)
  }

  const translations = {
    title: t('admin.condominiums.detail.quotas.title'),
    subtitle: t('admin.condominiums.detail.quotas.subtitle'),
    empty: t('admin.condominiums.detail.quotas.empty'),
    emptyDescription: t('admin.condominiums.detail.quotas.emptyDescription'),
    table: {
      unit: t('admin.condominiums.detail.quotas.table.unit'),
      concept: t('admin.condominiums.detail.quotas.table.concept'),
      period: t('admin.condominiums.detail.quotas.table.period'),
      amount: t('admin.condominiums.detail.quotas.table.amount'),
      balance: t('admin.condominiums.detail.quotas.table.balance'),
      status: t('admin.condominiums.detail.quotas.table.status'),
      dueDate: t('admin.condominiums.detail.quotas.table.dueDate'),
    },
    status: {
      pending: t('admin.condominiums.detail.quotas.status.pending'),
      paid: t('admin.condominiums.detail.quotas.status.paid'),
      overdue: t('admin.condominiums.detail.quotas.status.overdue'),
      cancelled: t('admin.condominiums.detail.quotas.status.cancelled'),
    },
    filters: {
      all: t('admin.condominiums.detail.quotas.filters.all'),
      searchPlaceholder: t('admin.condominiums.detail.quotas.filters.searchPlaceholder'),
      status: t('admin.condominiums.detail.quotas.filters.status'),
    },
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{translations.title}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {translations.subtitle}
        </Typography>
      </div>

      <QuotasTable quotas={quotas} translations={translations} />
    </div>
  )
}
