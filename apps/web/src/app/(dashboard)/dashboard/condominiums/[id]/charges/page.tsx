import { redirect } from 'next/navigation'

import { ChargesListClient } from './components/ChargesListClient'

import { getFullSession } from '@/libs/session'

export default async function ChargesPage() {
  const session = await getFullSession()

  if (!session.sessionToken) {
    redirect('/auth')
  }

  return <ChargesListClient />
}
