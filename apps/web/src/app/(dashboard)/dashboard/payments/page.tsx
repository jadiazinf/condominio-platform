import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { PaymentsTable } from './components/PaymentsTable'
import { PaymentsTableSkeleton } from './components/PaymentsTableSkeleton'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

async function PaymentsContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const isAdmin = session.activeRole === 'management_company'

  if (!isAdmin && !session.condominiums?.length) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Typography variant="h2">{t('admin.payments.title')}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('admin.payments.subtitle')}
        </Typography>
      </div>

      {/* Payments Table */}
      <PaymentsTable isAdmin={isAdmin} registerButtonLabel={t('admin.payments.register.button')} />
    </div>
  )
}

export default async function PaymentsPage() {
  return (
    <Suspense fallback={<PaymentsPageSkeleton />}>
      <PaymentsContent />
    </Suspense>
  )
}

function PaymentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <PaymentsTableSkeleton />
    </div>
  )
}
