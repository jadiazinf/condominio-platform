import { redirect } from 'next/navigation'

import { GenerateReceiptsClient } from './GenerateReceiptsClient'

import { getFullSession } from '@/libs/session'

interface PageProps {
  params: Promise<{ condominiumId: string }>
}

export default async function GenerateReceiptPage({ params }: PageProps) {
  const [session, { condominiumId }] = await Promise.all([
    getFullSession(),
    params,
  ])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  return <GenerateReceiptsClient condominiumId={condominiumId} condominiumName="" />
}
