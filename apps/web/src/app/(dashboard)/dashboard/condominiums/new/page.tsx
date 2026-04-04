import type { TManagementCompanySubscription } from '@packages/domain'
import type { TManagementCompanyUsageStats } from '@packages/http-client'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getMyCompanySubscription, getMyCompanyUsageStats } from '@packages/http-client'

import { CreateCondominiumForm } from './components'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

async function CreateCondominiumContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const isSuperadmin = session.superadmin?.isActive
  const isAdmin = session.activeRole === 'management_company'
  const adminCompanyId = isAdmin ? session.managementCompanies?.[0]?.managementCompanyId : undefined
  const adminCompanyName = isAdmin
    ? session.managementCompanies?.[0]?.managementCompanyName
    : undefined

  // Only superadmins and management company admins can access this page
  if (!isSuperadmin && !isAdmin) {
    redirect('/dashboard')
  }

  // Fetch subscription data for admin users
  let subscription: TManagementCompanySubscription | null = null
  let usageStats: TManagementCompanyUsageStats | null = null

  if (isAdmin && adminCompanyId && session.sessionToken) {
    try {
      ;[subscription, usageStats] = await Promise.all([
        getMyCompanySubscription(session.sessionToken, adminCompanyId),
        getMyCompanyUsageStats(session.sessionToken, adminCompanyId),
      ])
    } catch {
      // If we can't verify, allow access — the API will validate on submit
    }

    // Redirects must be outside try/catch to avoid double-render issues
    if (!subscription) {
      redirect('/dashboard/condominiums?reason=no-subscription')
    }

    if (
      usageStats &&
      subscription.maxCondominiums !== null &&
      usageStats.condominiumsCount >= subscription.maxCondominiums
    ) {
      redirect('/dashboard/condominiums?reason=limit-reached')
    }
  }

  const tp = isAdmin ? 'admin.condominiums' : 'superadmin.condominiums'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <CreateCondominiumForm
        adminCompanyId={adminCompanyId}
        adminCompanyName={adminCompanyName}
        subscription={subscription}
        subtitle={t(`${tp}.form.createSubtitle`)}
        title={t(`${tp}.form.createTitle`)}
        usageStats={usageStats}
      />
    </div>
  )
}

export default async function CreateCondominiumPage() {
  return (
    <Suspense fallback={<CreateCondominiumPageSkeleton />}>
      <CreateCondominiumContent />
    </Suspense>
  )
}

function CreateCondominiumPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-default-200" />
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <div className="h-[600px] animate-pulse rounded-lg border border-default-200 bg-default-100" />
    </div>
  )
}
