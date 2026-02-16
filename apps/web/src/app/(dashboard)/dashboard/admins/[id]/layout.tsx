import { ArrowLeft } from 'lucide-react'
import { redirect, notFound } from 'next/navigation'

import { Button } from '@/ui/components/button'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession, getServerAuthToken } from '@/libs/session'
import { getManagementCompanyById } from '@packages/http-client/hooks'

import { CompanySidebar } from './components/CompanySidebar'
import { CompanyDetailHeader } from './components/CompanyDetailHeader'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function CompanyDetailLayout({ children, params }: LayoutProps) {
  const { id } = await params
  const [{ t }, session, token] = await Promise.all([getTranslations(), getFullSession(), getServerAuthToken()])

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
        variant="light"
        startContent={<ArrowLeft size={16} />}
        className="mb-4"
        href="/dashboard/admins"
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
