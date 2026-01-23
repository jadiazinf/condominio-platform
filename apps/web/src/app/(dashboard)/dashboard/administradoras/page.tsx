import { Suspense } from 'react'
import { Plus } from 'lucide-react'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { redirect } from 'next/navigation'

import { CompaniesTable } from './components/CompaniesTable'
import { CompaniesTableSkeleton } from './components/CompaniesTableSkeleton'

async function CompaniesContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  // Only superadmins can access this page
  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('superadmin.companies.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.companies.subtitle')}
          </Typography>
        </div>
        <Button
          color="primary"
          href="/dashboard/administradoras/create"
          startContent={<Plus size={18} />}
        >
          {t('superadmin.companies.create')}
        </Button>
      </div>

      {/* Companies Table */}
      <CompaniesTable />
    </div>
  )
}

export default async function CompaniesPage() {
  return (
    <Suspense fallback={<CompaniesPageSkeleton />}>
      <CompaniesContent />
    </Suspense>
  )
}

function CompaniesPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded bg-default-200" />
      </div>
      <CompaniesTableSkeleton />
    </div>
  )
}
