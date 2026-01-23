import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { redirect, notFound } from 'next/navigation'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

import { CompanyDetail } from './components/CompanyDetail'
import { CompanyDetailSkeleton } from './components/CompanyDetailSkeleton'

interface PageProps {
  params: Promise<{ id: string }>
}

async function CompanyDetailContent({ id }: { id: string }) {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  // Only superadmins can access this page
  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }

  if (!id) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          className="mt-1"
          href="/dashboard/administradoras"
          isIconOnly
          size="sm"
          variant="flat"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <Typography variant="h2">{t('superadmin.companies.detail.title')}</Typography>
        </div>
      </div>

      {/* Detail */}
      <CompanyDetail id={id} />
    </div>
  )
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<CompanyDetailPageSkeleton />}>
      <CompanyDetailContent id={id} />
    </Suspense>
  )
}

function CompanyDetailPageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-default-200" />
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
        </div>
      </div>
      <CompanyDetailSkeleton />
    </div>
  )
}
