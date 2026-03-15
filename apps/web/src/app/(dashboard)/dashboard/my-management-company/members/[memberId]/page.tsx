import { redirect } from 'next/navigation'
import { getFullSession } from '@/libs/session'
import { MemberDetailPage } from '../components/MemberDetailPage'

interface MemberDetailRouteProps {
  params: Promise<{ memberId: string }>
}

export default async function MemberDetailRoute({ params }: MemberDetailRouteProps) {
  const session = await getFullSession()

  if (session.activeRole !== 'management_company') {
    redirect('/dashboard')
  }

  const memberRole = session.managementCompanies?.[0]?.roleName
  const managementCompanyId = session.managementCompanies?.[0]?.managementCompanyId

  if (memberRole !== 'admin' || !managementCompanyId) {
    redirect('/dashboard/my-management-company')
  }

  const { memberId } = await params

  return (
    <MemberDetailPage
      managementCompanyId={managementCompanyId}
      memberId={memberId}
    />
  )
}
