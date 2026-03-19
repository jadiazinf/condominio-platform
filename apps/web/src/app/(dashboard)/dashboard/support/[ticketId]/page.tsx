import { TicketDetailClient } from './TicketDetailClient'

interface PageProps {
  params: Promise<{ ticketId: string }>
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { ticketId } = await params

  return <TicketDetailClient ticketId={ticketId} />
}
