import { redirect } from 'next/navigation'
import { BillingReceiptsListClient } from './components/BillingReceiptsListClient'
import { getFullSession } from '@/libs/session'

export default async function BillingReceiptsPage() {
  const session = await getFullSession()
  if (!session.sessionToken) redirect('/auth')

  return <BillingReceiptsListClient />
}
