import { getCondominiumsPaginated, getPlatformCondominiumsPaginated } from '@packages/http-client'
import type { TCondominiumsQuery } from '@packages/domain'

import { getFullSession } from '@/libs/session'
import { CondominiumsPageClient } from './CondominiumsPageClient'
import { getSelectedCondominiumCookieServer } from '@/libs/cookies/server'
import { redirect } from 'next/navigation'

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
  const [session, selectedCondominium, params] = await Promise.all([
    getFullSession(),
    getSelectedCondominiumCookieServer(),
    searchParams,
  ])

  if (!session.sessionToken) {
    redirect('/signin')
  }

  // Build query from URL params
  const query: TCondominiumsQuery = {
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: params.limit ? parseInt(params.limit, 10) : 10,
    search: params.search || undefined,
    isActive: params.isActive === 'true' ? true : params.isActive === 'false' ? false : undefined,
    locationId: params.locationId || undefined,
  }

  const isSuperadmin = session.activeRole === 'superadmin'
  const condominiumId = selectedCondominium?.condominium?.id

  try {
    // Superadmin: fetch ALL condominiums via /platform/condominiums
    // Condominium users: fetch scoped via /condominium/condominiums
    const response = isSuperadmin
      ? await getPlatformCondominiumsPaginated(session.sessionToken, query)
      : await getCondominiumsPaginated(session.sessionToken, query, condominiumId)

    return (
      <CondominiumsPageClient
        condominiums={response.data}
        pagination={response.pagination}
        initialQuery={query}
      />
    )
  } catch {
    return (
      <CondominiumsPageClient
        condominiums={[]}
        pagination={{ total: 0, page: 1, limit: 10, totalPages: 0 }}
        initialQuery={query}
      />
    )
  }
}
