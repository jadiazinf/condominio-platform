import { redirect } from 'next/navigation'
import { GeneratePeriodClient } from './GeneratePeriodClient'
import { getFullSession } from '@/libs/session'

export default async function GeneratePeriodPage({ params }: { params: { id: string } }) {
  const session = await getFullSession()
  if (!session.sessionToken) redirect('/auth')

  return <GeneratePeriodClient channelId={params.id} />
}
