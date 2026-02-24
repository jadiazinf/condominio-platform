import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { getFullSession } from '@/libs/session'
import { getTranslations } from '@/libs/i18n/server'
import { ServiceDetailPageClient } from './components/ServiceDetailPageClient'

interface PageProps {
  params: Promise<{ id: string; serviceId: string }>
}

async function ServiceDetailContent({ params }: PageProps) {
  const { id, serviceId } = await params
  const [session, { t }] = await Promise.all([getFullSession(), getTranslations()])

  const managementCompanyId =
    session?.activeRole === 'management_company'
      ? session.managementCompanies?.[0]?.managementCompanyId ?? ''
      : ''

  if (!managementCompanyId) {
    redirect(`/dashboard/condominiums/${id}/services`)
  }

  const w = 'admin.condominiums.detail.services'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button
        className="mb-2"
        href={`/dashboard/condominiums/${id}/services`}
        variant="light"
        startContent={<ArrowLeft size={16} />}
      >
        {t(`${w}.title`)}
      </Button>

      <ServiceDetailPageClient
        condominiumId={id}
        serviceId={serviceId}
        managementCompanyId={managementCompanyId}
      />
    </div>
  )
}

export default async function ServiceDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <ServiceDetailContent params={params} />
    </Suspense>
  )
}

function ServiceDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="h-10 w-32 animate-pulse rounded-lg bg-default-200" />
      <div className="flex items-center gap-3">
        <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-default-200" />
      </div>
      <div className="h-40 animate-pulse rounded-lg border border-default-200 bg-default-100" />
      <div className="h-32 animate-pulse rounded-lg border border-default-200 bg-default-100" />
      <div className="h-48 animate-pulse rounded-lg border border-default-200 bg-default-100" />
    </div>
  )
}
