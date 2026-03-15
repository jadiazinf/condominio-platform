import { Suspense } from 'react'
import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { redirect } from 'next/navigation'
import { PendingAllocationsTable } from './components/PendingAllocationsTable'

async function PendingAllocationsContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const isAdmin = session.activeRole === 'management_company'
  if (!isAdmin && !session.condominiums?.length) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h2">{t('admin.payments.pendingAllocations.title')}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('admin.payments.pendingAllocations.subtitle')}
        </Typography>
      </div>
      <PendingAllocationsTable />
    </div>
  )
}

export default async function PendingAllocationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
          </div>
          <div className="h-64 animate-pulse rounded bg-default-100" />
        </div>
      }
    >
      <PendingAllocationsContent />
    </Suspense>
  )
}
