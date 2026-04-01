import { redirect } from 'next/navigation'
import { MyBillingChargesClient } from './components/MyBillingChargesClient'
import { getFullSession } from '@/libs/session'

export default async function MyBillingChargesPage() {
  const session = await getFullSession()
  if (!session.sessionToken) redirect('/auth')

  return <MyBillingChargesClient />
}
