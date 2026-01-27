import { cookies } from 'next/headers'
import { getSupportTickets } from '@packages/http-client'
import type { TTicketStatus, TTicketPriority } from '@packages/domain'

import { AdminTicketsPageClient } from './AdminTicketsPageClient'

interface TicketsPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    status?: TTicketStatus
    priority?: TTicketPriority
    search?: string
    page?: string
    limit?: string
  }>
}

export default async function TicketsPage({ params, searchParams }: TicketsPageProps) {
  const { id } = await params
  const queryParams = await searchParams
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value || ''

  const page = queryParams.page ? parseInt(queryParams.page, 10) : 1
  const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 10

  const filters = {
    status: queryParams.status,
    priority: queryParams.priority,
    search: queryParams.search,
    page,
    limit,
  }

  // Fetch tickets on the server
  const data = await getSupportTickets(id, filters, token)

  return (
    <AdminTicketsPageClient companyId={id} tickets={data.data} pagination={data.pagination} />
  )
}
