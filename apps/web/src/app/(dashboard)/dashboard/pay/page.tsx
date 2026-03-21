import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { PaymentWizardClient } from './components/PaymentWizardClient'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface IUnitOption {
  unitId: string
  unitNumber: string
  buildingName: string
  condominiumId: string
  condominiumName: string
}

async function PaymentWizardContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.condominiums?.length) {
    redirect('/dashboard')
  }

  // Extract unit options from session condominiums
  const unitOptions: IUnitOption[] = session.condominiums.flatMap(condo =>
    condo.units
      .filter(u => u.ownership.isActive)
      .map(u => ({
        unitId: u.unit.id,
        unitNumber: u.unit.unitNumber,
        buildingName: u.building?.name ?? '',
        condominiumId: condo.condominium.id,
        condominiumName: condo.condominium.name,
      }))
  )

  if (unitOptions.length === 0) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <Typography variant="h2">{t('resident.pay.title')}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('resident.pay.subtitle')}
        </Typography>
      </div>

      <PaymentWizardClient unitOptions={unitOptions} userId={session.user.id} />
    </div>
  )
}

export default async function PayPage() {
  return (
    <Suspense fallback={<PayPageSkeleton />}>
      <PaymentWizardContent />
    </Suspense>
  )
}

function PayPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-default-200" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-default-200" />
      </div>
      <div className="h-12 animate-pulse rounded-lg bg-default-200" />
      <div className="h-96 animate-pulse rounded-lg bg-default-200" />
    </div>
  )
}
