import { redirect } from 'next/navigation'
import { BillingReceiptsListClient } from './components/BillingReceiptsListClient'
import { getFullSession } from '@/libs/session'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BillingReceiptsPage({ params }: PageProps) {
  const [session, { id: condominiumId }] = await Promise.all([
    getFullSession(),
    params,
  ])

  if (!session.sessionToken) redirect('/auth')

  return <BillingReceiptsListClient condominiumId={condominiumId} />
}
