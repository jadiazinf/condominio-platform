import { redirect } from 'next/navigation'
import { getFullSession } from '@/libs/session'
import { MyCompanyMembersPage } from './components/MyCompanyMembersPage'

export default async function MembersPage() {
  const session = await getFullSession()

  if (session.activeRole !== 'management_company') {
    redirect('/dashboard')
  }

  const memberRole = session.managementCompanies?.[0]?.roleName
  const managementCompanyId = session.managementCompanies?.[0]?.managementCompanyId

  // Only admin role can access the members page
  if (memberRole !== 'admin' || !managementCompanyId) {
    redirect('/dashboard/my-management-company')
  }

  return <MyCompanyMembersPage managementCompanyId={managementCompanyId} />
}
