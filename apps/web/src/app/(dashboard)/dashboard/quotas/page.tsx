import { Suspense } from 'react'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { redirect } from 'next/navigation'

import { QuotasTable } from './components/QuotasTable'
import { QuotasTableSkeleton } from './components/QuotasTableSkeleton'

async function QuotasContent() {
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
          <Typography variant="h2">{t('admin.quotas.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('admin.quotas.subtitle')}
          </Typography>
        </div>
      </div>

      {/* Quotas Table */}
      <QuotasTable />
    </div>
  )
}

export default async function QuotasPage() {
  return (
    <Suspense fallback={<QuotasPageSkeleton />}>
      <QuotasContent />
    </Suspense>
  )
}

function QuotasPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <QuotasTableSkeleton />
    </div>
  )
}
