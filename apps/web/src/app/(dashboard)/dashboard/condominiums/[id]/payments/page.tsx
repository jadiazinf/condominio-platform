import type { TPayment } from '@packages/domain'
import { getHttpClient } from '@packages/http-client'
import type { TApiDataResponse } from '@packages/http-client'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { PaymentsTable } from './components/PaymentsTable'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPaymentsForCondominium(token: string, condominiumId: string): Promise<TPayment[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPayment[]>>('/condominium/payments', {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-condominium-id': condominiumId,
    },
  })
  return response.data.data
}

export default async function CondominiumPaymentsPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token] = await Promise.all([getTranslations(), getServerAuthToken()])

  let payments: TPayment[] = []
  try {
    payments = await getPaymentsForCondominium(token, id)
  } catch (error) {
    console.error('Failed to fetch payments:', error)
  }

  const translations = {
    title: t('admin.condominiums.detail.payments.title'),
    subtitle: t('admin.condominiums.detail.payments.subtitle'),
    empty: t('admin.condominiums.detail.payments.empty'),
    emptyDescription: t('admin.condominiums.detail.payments.emptyDescription'),
    table: {
      paymentNumber: t('admin.condominiums.detail.payments.table.paymentNumber'),
      unit: t('admin.condominiums.detail.payments.table.unit'),
      amount: t('admin.condominiums.detail.payments.table.amount'),
      method: t('admin.condominiums.detail.payments.table.method'),
      status: t('admin.condominiums.detail.payments.table.status'),
      date: t('admin.condominiums.detail.payments.table.date'),
    },
    status: {
      pending: t('admin.condominiums.detail.payments.status.pending'),
      pending_verification: t('admin.condominiums.detail.payments.status.pendingVerification'),
      completed: t('admin.condominiums.detail.payments.status.completed'),
      failed: t('admin.condominiums.detail.payments.status.failed'),
      refunded: t('admin.condominiums.detail.payments.status.refunded'),
      rejected: t('admin.condominiums.detail.payments.status.rejected'),
    },
    methods: {
      transfer: t('admin.condominiums.detail.payments.methods.transfer'),
      cash: t('admin.condominiums.detail.payments.methods.cash'),
      card: t('admin.condominiums.detail.payments.methods.card'),
      mobile_payment: t('admin.condominiums.detail.payments.methods.mobilePayment'),
      gateway: t('admin.condominiums.detail.payments.methods.gateway'),
      other: t('admin.condominiums.detail.payments.methods.other'),
    },
    filters: {
      all: t('admin.condominiums.detail.payments.filters.all'),
      searchPlaceholder: t('admin.condominiums.detail.payments.filters.searchPlaceholder'),
      status: t('admin.condominiums.detail.payments.filters.status'),
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

      <PaymentsTable payments={payments} translations={translations} />
    </div>
  )
}
