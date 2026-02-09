import { Suspense } from 'react'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { redirect } from 'next/navigation'

import { AmenitiesClient } from './components/AmenitiesClient'

async function AmenitiesContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  // Admins and superadmins can access
  if (!session.superadmin?.isActive && !session.condominiums?.length) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('admin.amenities.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.amenities.subtitle')}
          </Typography>
        </div>
      </div>

      {/* Amenities Grid */}
      <AmenitiesClient />
    </div>
  )
}

export default async function AmenitiesPage() {
  return (
    <Suspense fallback={<AmenitiesPageSkeleton />}>
      <AmenitiesContent />
    </Suspense>
  )
}

function AmenitiesPageSkeleton() {
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
