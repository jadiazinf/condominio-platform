import type { TPaymentConcept } from '@packages/domain'
import { getHttpClient } from '@packages/http-client'
import type { TApiDataResponse } from '@packages/http-client'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { PaymentConceptsTable } from './components/PaymentConceptsTable'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPaymentConceptsForCondominium(token: string, condominiumId: string): Promise<TPaymentConcept[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPaymentConcept[]>>('/condominium/payment-concepts', {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-condominium-id': condominiumId,
    },
  })
  return response.data.data
}

export default async function CondominiumPaymentConceptsPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token] = await Promise.all([getTranslations(), getServerAuthToken()])

  let paymentConcepts: TPaymentConcept[] = []
  try {
    paymentConcepts = await getPaymentConceptsForCondominium(token, id)
  } catch (error) {
    console.error('Failed to fetch payment concepts:', error)
  }

  const translations = {
    title: t('admin.condominiums.detail.paymentConcepts.title'),
    subtitle: t('admin.condominiums.detail.paymentConcepts.subtitle'),
    empty: t('admin.condominiums.detail.paymentConcepts.empty'),
    emptyDescription: t('admin.condominiums.detail.paymentConcepts.emptyDescription'),
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
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{translations.title}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {translations.subtitle}
        </Typography>
      </div>

      <PaymentConceptsTable paymentConcepts={paymentConcepts} translations={translations} />
    </div>
  )
}
