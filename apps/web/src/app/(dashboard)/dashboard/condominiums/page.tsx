import { cookies } from 'next/headers'
import { getCondominiumsPaginated } from '@packages/http-client'
import type { TCondominiumsQuery } from '@packages/domain'

import { SESSION_COOKIE_NAME } from '@/libs/cookies'
import { CondominiumsPageClient } from './CondominiumsPageClient'

interface CondominiumsPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    isActive?: string
    locationId?: string
  }>
}

export default async function CondominiumsPage({ searchParams }: CondominiumsPageProps) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || ''
  const params = await searchParams

  // Build query from URL params
  const query: TCondominiumsQuery = {
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: params.limit ? parseInt(params.limit, 10) : 10,
    search: params.search || undefined,
    isActive: params.isActive === 'true' ? true : params.isActive === 'false' ? false : undefined,
    locationId: params.locationId || undefined,
  }

  // Fetch condominiums on the server with pagination
  const response = await getCondominiumsPaginated(token, query)

  return (
    <CondominiumsPageClient
      condominiums={response.data}
      pagination={response.pagination}
      initialQuery={query}
    />
  )
}
