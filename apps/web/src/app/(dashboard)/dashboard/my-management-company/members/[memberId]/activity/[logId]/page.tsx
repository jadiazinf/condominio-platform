import { redirect } from 'next/navigation'
import { getFullSession } from '@/libs/session'
import { AuditLogDetailPage } from '../../../components/AuditLogDetailPage'

interface AuditLogDetailRouteProps {
  params: Promise<{ memberId: string; logId: string }>
}

export default async function AuditLogDetailRoute({ params }: AuditLogDetailRouteProps) {
  const session = await getFullSession()

  if (session.activeRole !== 'management_company') {
    redirect('/dashboard')
  }

  const memberRole = session.managementCompanies?.[0]?.roleName
  const managementCompanyId = session.managementCompanies?.[0]?.managementCompanyId

  if (memberRole !== 'admin' || !managementCompanyId) {
    redirect('/dashboard/my-management-company')
  }

  const { memberId, logId } = await params

  return (
    <AuditLogDetailPage
      managementCompanyId={managementCompanyId}
      memberId={memberId}
      logId={logId}
    />
  )
}
