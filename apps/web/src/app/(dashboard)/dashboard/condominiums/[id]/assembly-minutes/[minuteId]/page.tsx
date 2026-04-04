import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { AssemblyMinuteDetailClient } from './AssemblyMinuteDetailClient'

import { Button } from '@/ui/components/button'
import { getFullSession } from '@/libs/session'
import { getTranslations } from '@/libs/i18n/server'

interface PageProps {
  params: Promise<{ id: string; minuteId: string }>
}

async function AssemblyMinuteDetailContent({ params }: PageProps) {
  const { id, minuteId } = await params
  const [session, { t }] = await Promise.all([getFullSession(), getTranslations()])

  const managementCompanyId =
    session?.activeRole === 'management_company'
      ? (session.managementCompanies?.[0]?.managementCompanyId ?? '')
      : ''

  if (!managementCompanyId) {
    redirect(`/dashboard/condominiums/${id}/assembly-minutes`)
  }

  const p = 'admin.condominiums.detail.assemblyMinutes'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button
        className="mb-2"
        href={`/dashboard/condominiums/${id}/assembly-minutes`}
        startContent={<ArrowLeft size={16} />}
        variant="light"
      >
        {t(`${p}.title`)}
      </Button>

      <AssemblyMinuteDetailClient
        condominiumId={id}
        minuteId={minuteId}
      />
    </div>
  )
}

export default async function AssemblyMinuteDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<AssemblyMinuteDetailSkeleton />}>
      <AssemblyMinuteDetailContent params={params} />
    </Suspense>
  )
}

function AssemblyMinuteDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="h-10 w-32 animate-pulse rounded-lg bg-default-200" />
      <div className="flex items-center gap-3">
        <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-default-200" />
      </div>
      <div className="h-40 animate-pulse rounded-lg border border-default-200 bg-default-100" />
      <div className="h-32 animate-pulse rounded-lg border border-default-200 bg-default-100" />
    </div>
  )
}
