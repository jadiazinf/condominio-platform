import { redirect } from 'next/navigation'
import { getFullSession } from '@/libs/session'
import { PaymentConceptsPageClient } from './components/PaymentConceptsPageClient'

export default async function PaymentConceptsPage() {
  const session = await getFullSession()

  if (session.activeRole !== 'management_company') {
    redirect('/dashboard')
  }

  const managementCompanyId = session.managementCompanies?.[0]?.managementCompanyId

  if (!managementCompanyId) {
    redirect('/dashboard')
  }

  return <PaymentConceptsPageClient managementCompanyId={managementCompanyId} />
}
