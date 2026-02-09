import { Suspense } from 'react'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { redirect } from 'next/navigation'

import { ReportPaymentClient } from './components/ReportPaymentClient'

interface IUnitOption {
  unitId: string
  unitNumber: string
  buildingName: string
  condominiumName: string
}

async function ReportPaymentContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  // Any authenticated user with condominiums can access
  if (!session.condominiums?.length) {
    redirect('/dashboard')
  }

  // Extract unit options from session condominiums
  const unitOptions: IUnitOption[] = session.condominiums.flatMap((condo) =>
    condo.units
      .filter((u) => u.ownership.isActive)
      .map((u) => ({
        unitId: u.unit.id,
        unitNumber: u.unit.unitNumber,
        buildingName: u.building.name,
        condominiumName: condo.condominium.name,
      }))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('resident.reportPayment.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('resident.reportPayment.subtitle')}
          </Typography>
        </div>
      </div>

      {/* Report Payment Form */}
      <ReportPaymentClient
        userId={session.user.id}
        unitOptions={unitOptions}
      />
    </div>
  )
}

export default async function ReportPaymentPage() {
  return (
    <Suspense fallback={<ReportPaymentPageSkeleton />}>
      <ReportPaymentContent />
    </Suspense>
  )
}

function ReportPaymentPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-default-200" />
    </div>
  )
}
