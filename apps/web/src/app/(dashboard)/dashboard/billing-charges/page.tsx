import { redirect } from 'next/navigation'
import { BillingChargesListClient } from './components/BillingChargesListClient'
import { getFullSession } from '@/libs/session'

export default async function BillingChargesPage() {
  const session = await getFullSession()
  if (!session.sessionToken) redirect('/auth')

  return <BillingChargesListClient />
}
