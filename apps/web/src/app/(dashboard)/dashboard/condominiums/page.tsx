import {
  getCondominiumsPaginated,
  getPlatformCondominiumsPaginated,
  getCompanyCondominiumsPaginated,
  getMyCompanySubscription,
  getMyCompanyUsageStats,
} from '@packages/http-client'
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
    redirect('/auth')
  }

  const isSuperadmin = session.activeRole === 'superadmin'
  const isAdmin = session.activeRole === 'management_company'
  const condominiumId = selectedCondominium?.condominium?.id
  const companyId = isAdmin ? session.managementCompanies?.[0]?.managementCompanyId : undefined

  // Build query from URL params
  // Admin defaults to isActive=true to show active condominiums first
  const defaultIsActive = isAdmin && params.isActive === undefined ? true : undefined
  const query: TCondominiumsQuery = {
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: params.limit ? parseInt(params.limit, 10) : 10,
    search: params.search || undefined,
    isActive: params.isActive === 'true' ? true : params.isActive === 'false' ? false : defaultIsActive,
    locationId: params.locationId || undefined,
  }

  try {
    // Superadmin: fetch ALL condominiums via /platform/condominiums
    // Admin (management_company): fetch company condominiums via /platform/condominiums/management-company/:id
    // Condominium users: fetch scoped via /condominium/condominiums
    const condominiumsPromise = isSuperadmin
      ? getPlatformCondominiumsPaginated(session.sessionToken, query)
      : isAdmin && companyId
        ? getCompanyCondominiumsPaginated(session.sessionToken, companyId, query)
        : getCondominiumsPaginated(session.sessionToken, query, condominiumId)

    // For admin users, also fetch subscription + usage stats to check creation limits
    let canCreateCondominium: boolean | undefined
    if (isAdmin && companyId) {
      const [response, subscription, usageStats] = await Promise.all([
        condominiumsPromise,
        getMyCompanySubscription(session.sessionToken, companyId).catch(() => null),
        getMyCompanyUsageStats(session.sessionToken, companyId).catch(() => null),
      ])

      if (subscription && usageStats) {
        canCreateCondominium = subscription.maxCondominiums === null
          || usageStats.condominiumsCount < subscription.maxCondominiums
      }

      return (
        <CondominiumsPageClient
          condominiums={response.data}
          pagination={response.pagination}
          initialQuery={query}
          role={session.activeRole}
          canCreateCondominium={canCreateCondominium}
        />
      )
    }

    const response = await condominiumsPromise

    return (
      <CondominiumsPageClient
        condominiums={response.data}
        pagination={response.pagination}
        initialQuery={query}
        role={session.activeRole}
      />
    )
  } catch (error) {
    console.error('Failed to fetch condominiums:', error)
    return (
      <CondominiumsPageClient
        condominiums={[]}
        pagination={{ total: 0, page: 1, limit: 10, totalPages: 0 }}
        initialQuery={query}
        role={session.activeRole}
      />
    )
  }
}
