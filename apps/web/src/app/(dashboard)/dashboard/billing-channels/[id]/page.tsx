import { redirect } from 'next/navigation'
import { BillingChannelDetailClient } from './BillingChannelDetailClient'
import { getFullSession } from '@/libs/session'

export default async function BillingChannelDetailPage({ params }: { params: { id: string } }) {
  const session = await getFullSession()
  if (!session.sessionToken) redirect('/auth')

  return <BillingChannelDetailClient channelId={params.id} />
}
