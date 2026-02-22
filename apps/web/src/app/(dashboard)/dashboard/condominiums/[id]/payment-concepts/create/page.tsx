import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { TApiDataResponse } from '@packages/http-client'
import { getHttpClient } from '@packages/http-client'

import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { CreatePaymentConceptClient } from '../components/wizard/CreatePaymentConceptClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCurrencies(token: string, managementCompanyId: string): Promise<Array<{ id: string; code: string; name?: string }>> {
  try {
    const client = getHttpClient()
    const response = await client.get<TApiDataResponse<Array<{ id: string; code: string; name?: string }>>>(
      `/${managementCompanyId}/me/currencies`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data
  } catch {
    return []
  }
}

async function getBuildings(token: string, condominiumId: string, managementCompanyId?: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const client = getHttpClient()
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'x-condominium-id': condominiumId,
    }
    if (managementCompanyId) {
      headers['x-management-company-id'] = managementCompanyId
    }
    const response = await client.get<TApiDataResponse<Array<{ id: string; name: string }>>>('/condominium/buildings', { headers })
    return response.data.data
  } catch {
    return []
  }
}

async function CreatePaymentConceptContent({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token, session] = await Promise.all([getTranslations(), getServerAuthToken(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId ?? ''
    : ''

  if (!managementCompanyId) {
    redirect(`/dashboard/condominiums/${id}/payment-concepts`)
  }

  const [currencies, buildings] = await Promise.all([
    getCurrencies(token, managementCompanyId),
    getBuildings(token, id, managementCompanyId),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-4">
        <Button
          className="mt-1"
          href={`/dashboard/condominiums/${id}/payment-concepts`}
          isIconOnly
          variant="flat"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <Typography variant="h2">
            {t('admin.condominiums.detail.paymentConcepts.wizard.title')}
          </Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.condominiums.detail.paymentConcepts.wizard.subtitle')}
          </Typography>
        </div>
      </div>

      <CreatePaymentConceptClient
        condominiumId={id}
        managementCompanyId={managementCompanyId}
        currencies={currencies}
        buildings={buildings}
      />
    </div>
  )
}

export default async function CreatePaymentConceptPage({ params }: PageProps) {
  return (
    <Suspense fallback={<CreatePaymentConceptSkeleton />}>
      <CreatePaymentConceptContent params={params} />
    </Suspense>
  )
}

function CreatePaymentConceptSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-default-200" />
        <div>
          <div className="h-8 w-72 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <div className="h-12 animate-pulse rounded-lg bg-default-100" />
      <div className="h-[500px] animate-pulse rounded-lg border border-default-200 bg-default-100" />
    </div>
  )
}
