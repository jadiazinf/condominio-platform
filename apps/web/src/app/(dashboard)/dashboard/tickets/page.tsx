import { cookies } from 'next/headers'
import { getAllSupportTickets } from '@packages/http-client'
import type { TTicketStatus, TTicketPriority } from '@packages/domain'

import { SESSION_COOKIE_NAME } from '@/libs/cookies'
import { TicketsPageClient } from './TicketsPageClient'

interface PageProps {
  searchParams: Promise<{
    status?: TTicketStatus
    priority?: TTicketPriority
    search?: string
    page?: string
    limit?: string
  }>
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || ''

  const page = params.page ? parseInt(params.page, 10) : 1
  const limit = params.limit ? parseInt(params.limit, 10) : 10

  const filters = {
    status: params.status,
    priority: params.priority,
    search: params.search,
    page,
    limit,
  }

  // Fetch tickets on the server
  const data = await getAllSupportTickets(filters, token)

  return <TicketsPageClient tickets={data.data} pagination={data.pagination} />
}
