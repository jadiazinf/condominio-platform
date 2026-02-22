import type { TPaymentConcept } from '@packages/domain'
import { getHttpClient } from '@packages/http-client'
import type { TApiDataResponse } from '@packages/http-client'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { PaymentConceptsPageClient } from './components/PaymentConceptsPageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPaymentConceptsForCondominium(
  token: string,
  condominiumId: string,
  managementCompanyId?: string,
): Promise<TPaymentConcept[]> {
  const client = getHttpClient()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'x-condominium-id': condominiumId,
  }
  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }
  const response = await client.get<TApiDataResponse<TPaymentConcept[]>>('/condominium/payment-concepts', { headers })
  return response.data.data
}

export default async function CondominiumPaymentConceptsPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token, session] = await Promise.all([getTranslations(), getServerAuthToken(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId ?? ''
    : ''

  const paymentConcepts = await getPaymentConceptsForCondominium(token, id, managementCompanyId).catch(() => [] as TPaymentConcept[])

  const translations = {
    title: t('admin.condominiums.detail.paymentConcepts.title'),
    subtitle: t('admin.condominiums.detail.paymentConcepts.subtitle'),
    empty: t('admin.condominiums.detail.paymentConcepts.empty'),
    emptyDescription: t('admin.condominiums.detail.paymentConcepts.emptyDescription'),
    addConcept: t('admin.condominiums.detail.paymentConcepts.addConcept'),
    table: {
      name: t('admin.condominiums.detail.paymentConcepts.table.name'),
      type: t('admin.condominiums.detail.paymentConcepts.table.type'),
      recurring: t('admin.condominiums.detail.paymentConcepts.table.recurring'),
      recurrence: t('admin.condominiums.detail.paymentConcepts.table.recurrence'),
      status: t('admin.condominiums.detail.paymentConcepts.table.status'),
    },
    types: {
      maintenance: t('admin.condominiums.detail.paymentConcepts.types.maintenance'),
      condominium_fee: t('admin.condominiums.detail.paymentConcepts.types.condominiumFee'),
      extraordinary: t('admin.condominiums.detail.paymentConcepts.types.extraordinary'),
      fine: t('admin.condominiums.detail.paymentConcepts.types.fine'),
      other: t('admin.condominiums.detail.paymentConcepts.types.other'),
    },
    recurrence: {
      monthly: t('admin.condominiums.detail.paymentConcepts.recurrence.monthly'),
      quarterly: t('admin.condominiums.detail.paymentConcepts.recurrence.quarterly'),
      yearly: t('admin.condominiums.detail.paymentConcepts.recurrence.yearly'),
    },
    yes: t('common.yes'),
    no: t('common.no'),
    status: {
      active: t('common.status.active'),
      inactive: t('common.status.inactive'),
    },
  }

  return (
    <PaymentConceptsPageClient
      condominiumId={id}
      managementCompanyId={managementCompanyId}
      paymentConcepts={paymentConcepts}
      translations={translations}
    />
  )
}
