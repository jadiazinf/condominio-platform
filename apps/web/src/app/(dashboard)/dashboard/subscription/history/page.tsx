import { redirect } from 'next/navigation'

import { getFullSession } from '@/libs/session'
import { SubscriptionHistoryPage } from './components/SubscriptionHistoryPage'

export default async function HistoryPage() {
  const session = await getFullSession()

  const companyId = session.managementCompanies?.[0]?.managementCompanyId
  if (!companyId) {
    redirect('/dashboard')
  }

  return <SubscriptionHistoryPage companyId={companyId} />
}
