import { redirect } from 'next/navigation'
import { getFullSession } from '@/libs/session'
import { BankAccountsPage } from './components/BankAccountsPage'

export default async function BankAccountsRoute() {
  const session = await getFullSession()

  if (session.activeRole !== 'management_company') {
    redirect('/dashboard')
  }

  const memberRole = session.managementCompanies?.[0]?.roleName
  const managementCompanyId = session.managementCompanies?.[0]?.managementCompanyId

  if (!managementCompanyId) {
    redirect('/dashboard/my-management-company')
  }

  return (
    <BankAccountsPage
      managementCompanyId={managementCompanyId}
      memberRole={memberRole ?? null}
    />
  )
}
