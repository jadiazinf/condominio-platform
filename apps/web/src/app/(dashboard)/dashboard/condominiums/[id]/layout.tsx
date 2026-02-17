import { getTranslations } from '@/libs/i18n/server'
import { getCondominiumDetail } from '@packages/http-client/hooks'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { CondominiumDetailLayout } from './components/CondominiumDetailLayout'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function CondominiumLayout({ children, params }: LayoutProps) {
  const { id } = await params
  const [token, session] = await Promise.all([getServerAuthToken(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId
    : undefined

  const condominium = await getCondominiumDetail(token, id, managementCompanyId)

  return (
    <CondominiumDetailLayout condominium={condominium} currentUserId={session?.user?.id} userRole={session?.activeRole}>
      {children}
    </CondominiumDetailLayout>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ t }, token, session] = await Promise.all([getTranslations(), getServerAuthToken(), getFullSession()])

  const mcId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId
    : undefined

  try {
    const condominium = await getCondominiumDetail(token, id, mcId)
    return {
      title: `${condominium.name} | ${t('superadmin.condominiums.detail.title')}`,
    }
  } catch {
    return {
      title: t('superadmin.condominiums.detail.title'),
    }
  }
}
