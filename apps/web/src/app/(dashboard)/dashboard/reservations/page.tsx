import { Suspense } from 'react'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { redirect } from 'next/navigation'

import { ReservationsClient } from './components/ReservationsClient'

async function ReservationsContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  // Residents with condominium access can use reservations
  if (!session.condominiums?.length) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('resident.reservations.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('resident.reservations.subtitle')}
          </Typography>
        </div>
      </div>

      {/* Reservations Client */}
      <ReservationsClient />
    </div>
  )
}

export default async function ReservationsPage() {
  return (
    <Suspense fallback={<ReservationsPageSkeleton />}>
      <ReservationsContent />
    </Suspense>
  )
}

function ReservationsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-default-200" />
        ))}
      </div>
    </div>
  )
}
