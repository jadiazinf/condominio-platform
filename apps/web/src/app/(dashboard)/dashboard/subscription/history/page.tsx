import { redirect } from 'next/navigation'

import { SubscriptionHistoryPage } from './components/SubscriptionHistoryPage'

import { getFullSession } from '@/libs/session'

export default async function HistoryPage() {
  const session = await getFullSession()

  const companyId = session.managementCompanies?.[0]?.managementCompanyId

  if (!companyId) {
    redirect('/dashboard')
  }

  return <SubscriptionHistoryPage companyId={companyId} />
}
