import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

import { CreateCondominiumForm } from './components'

async function CreateCondominiumContent() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const isSuperadmin = session.superadmin?.isActive
  const isAdmin = session.activeRole === 'management_company'
  const adminCompanyId = isAdmin ? session.managementCompanies?.[0]?.managementCompanyId : undefined
  const adminCompanyName = isAdmin ? session.managementCompanies?.[0]?.managementCompanyName : undefined

  // Only superadmins and management company admins can access this page
  if (!isSuperadmin && !isAdmin) {
    redirect('/dashboard')
  }

  const tp = isAdmin ? 'admin.condominiums' : 'superadmin.condominiums'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button className="mt-1" href="/dashboard/condominiums" isIconOnly variant="flat">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <Typography variant="h2">{t(`${tp}.form.createTitle`)}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t(`${tp}.form.createSubtitle`)}
          </Typography>
        </div>
      </div>

      {/* Form */}
      <CreateCondominiumForm
        adminCompanyId={adminCompanyId}
        adminCompanyName={adminCompanyName}
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
