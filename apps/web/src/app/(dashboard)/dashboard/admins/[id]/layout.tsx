import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { redirect, notFound } from 'next/navigation'

import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

import { CompanySidebar } from './components/CompanySidebar'
import { CompanyDetailHeader } from './components/CompanyDetailHeader'

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
    <div className="max-w-6xl mx-auto">
      <Button
        variant="light"
        startContent={<ArrowLeft size={16} />}
        className="mb-4"
        href="/dashboard/admins"
      >
        {t('common.backToList')}
      </Button>

      <Suspense fallback={<div className="h-32 animate-pulse rounded bg-default-200" />}>
        <CompanyDetailHeader companyId={id} />
      </Suspense>

      <div className="flex flex-col md:flex-row gap-8 mt-6">
        <CompanySidebar companyId={id} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
