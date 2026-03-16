import { ArrowLeft } from 'lucide-react'
import { redirect, notFound } from 'next/navigation'
import { getManagementCompanyById } from '@packages/http-client/hooks'

import { CompanySidebar } from './components/CompanySidebar'
import { CompanyDetailHeader } from './components/CompanyDetailHeader'

import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession, getServerAuthToken } from '@/libs/session'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function CompanyDetailLayout({ children, params }: LayoutProps) {
  const { id } = await params
  const [{ t }, session, token] = await Promise.all([
    getTranslations(),
    getFullSession(),
    getServerAuthToken(),
  ])

  // Only superadmins can access this page
  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }

  if (!id) {
    notFound()
  }

  const company = await getManagementCompanyById(token, id)

  return (
    <div className="max-w-6xl mx-auto">
      <Button
        className="mb-4"
        href="/dashboard/admins"
        startContent={<ArrowLeft size={16} />}
        variant="light"
      >
        {t('common.backToList')}
      </Button>

      <CompanyDetailHeader company={company} />

      <div className="flex flex-col md:flex-row gap-8 mt-6">
        <CompanySidebar companyId={id} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
