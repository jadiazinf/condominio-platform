import { Suspense } from 'react'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { redirect } from 'next/navigation'

import { MyPaymentsClient } from './components/MyPaymentsClient'

async function MyPaymentsContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  // Any authenticated user with condominiums can access
  if (!session.condominiums?.length) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('resident.myPayments.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('resident.myPayments.subtitle')}
          </Typography>
        </div>
      </div>

      {/* Payments List */}
      <MyPaymentsClient userId={session.user.id} />
    </div>
  )
}

export default async function MyPaymentsPage() {
  return (
    <Suspense fallback={<MyPaymentsPageSkeleton />}>
      <MyPaymentsContent />
    </Suspense>
  )
}

function MyPaymentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-default-200" />
        ))}
      </div>
    </div>
  )
}
