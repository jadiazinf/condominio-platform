import { Suspense } from 'react'

import { TicketDetail, TicketDetailSkeleton } from './components'

interface TicketDetailPageProps {
  params: Promise<{
    id: string
    ticketId: string
  }>
}

export default async function TicketDetailPage({
  params,
}: TicketDetailPageProps) {
  const { id, ticketId } = await params

  return (
    <div className="space-y-6">
      <Suspense fallback={<TicketDetailSkeleton />}>
        <TicketDetail companyId={id} ticketId={ticketId} />
      </Suspense>
    </div>
  )
}
