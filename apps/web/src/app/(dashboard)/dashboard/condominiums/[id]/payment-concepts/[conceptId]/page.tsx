import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { getFullSession } from '@/libs/session'
import { getTranslations } from '@/libs/i18n/server'
import { PaymentConceptDetailPageClient } from '../components/PaymentConceptDetailPageClient'

interface PageProps {
  params: Promise<{ id: string; conceptId: string }>
}

async function PaymentConceptDetailContent({ params }: PageProps) {
  const { id, conceptId } = await params
  const [session, { t }] = await Promise.all([getFullSession(), getTranslations()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId ?? ''
    : ''

  if (!managementCompanyId) {
    redirect(`/dashboard/condominiums/${id}/payment-concepts`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button
        className="mb-2"
        href={`/dashboard/condominiums/${id}/payment-concepts`}
        variant="light"
        startContent={<ArrowLeft size={16} />}
      >
        {t('admin.condominiums.detail.paymentConcepts.title')}
      </Button>

      <PaymentConceptDetailPageClient
        condominiumId={id}
        conceptId={conceptId}
        managementCompanyId={managementCompanyId}
      />
    </div>
  )
}

export default async function PaymentConceptDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PaymentConceptDetailSkeleton />}>
      <PaymentConceptDetailContent params={params} />
    </Suspense>
  )
}

function PaymentConceptDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="h-10 w-10 animate-pulse rounded-lg bg-default-200" />
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-default-200" />
      </div>
      <div className="h-40 animate-pulse rounded-lg border border-default-200 bg-default-100" />
      <div className="h-32 animate-pulse rounded-lg border border-default-200 bg-default-100" />
      <div className="h-28 animate-pulse rounded-lg border border-default-200 bg-default-100" />
      <div className="h-28 animate-pulse rounded-lg border border-default-200 bg-default-100" />
    </div>
  )
}
