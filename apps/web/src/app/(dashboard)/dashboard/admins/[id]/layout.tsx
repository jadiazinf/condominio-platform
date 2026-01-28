import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { redirect, notFound } from 'next/navigation'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

import { CompanySidebar } from './components/CompanySidebar'
import { CompanyHeader } from './components/CompanyHeader'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function CompanyDetailLayout({ children, params }: LayoutProps) {
  const { id } = await params
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  // Only superadmins can access this page
  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }

  if (!id) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header with back button */}
      <div className="flex items-start gap-4">
        <Button className="mt-1" href="/dashboard/admins" isIconOnly variant="flat">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <Typography variant="h2">{t('superadmin.companies.detail.title')}</Typography>
          <Suspense
            fallback={<div className="h-6 w-64 animate-pulse rounded bg-default-200 mt-1" />}
          >
            <CompanyHeader companyId={id} />
          </Suspense>
        </div>
      </div>

      {/* Sidebar and content */}
      <div className="flex flex-col md:flex-row gap-8">
        <CompanySidebar companyId={id} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
