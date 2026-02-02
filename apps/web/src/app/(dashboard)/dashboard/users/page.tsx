import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { UsersTable } from './components/UsersTable'
import { UsersTableSkeleton } from './components/UsersTableSkeleton'

async function UsersContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  // Only superadmins can access this page
  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }

  // Check for platform_superadmins read permission
  const hasViewPermission = session.superadminPermissions?.some(
    p => p.module === 'platform_superadmins' && p.action === 'read'
  )

  if (!hasViewPermission) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">{t('superadmin.users.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.users.subtitle')}
          </Typography>
        </div>
        <Button
          color="primary"
          href="/dashboard/users/new"
          startContent={<Plus className="h-4 w-4" />}
        >
          {t('superadmin.users.createUser')}
        </Button>
      </div>

      {/* Users Table */}
      <UsersTable />
    </div>
  )
}

export default async function UsersPage() {
  return (
    <Suspense fallback={<UsersPageSkeleton />}>
      <UsersContent />
    </Suspense>
  )
}

function UsersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-md bg-default-200" />
      </div>
      <UsersTableSkeleton />
    </div>
  )
}
