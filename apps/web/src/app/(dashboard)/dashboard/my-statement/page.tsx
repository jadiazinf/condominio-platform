import { redirect } from 'next/navigation'
import { MyStatementClient } from './components/MyStatementClient'
import { getFullSession } from '@/libs/session'

export default async function MyStatementPage() {
  const session = await getFullSession()
  if (!session.sessionToken) redirect('/auth')

  return <MyStatementClient />
}
