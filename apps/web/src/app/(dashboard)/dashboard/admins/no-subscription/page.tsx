import type { TManagementCompaniesQuery } from '@packages/domain'

import { getManagementCompaniesPaginated } from '@packages/http-client'
import { redirect } from 'next/navigation'

import { NoSubscriptionPageClient } from './components/NoSubscriptionPageClient'

import { getFullSession } from '@/libs/session'

interface NoSubscriptionPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    isActive?: string
  }>
}

export default async function NoSubscriptionPage({ searchParams }: NoSubscriptionPageProps) {
  const [session, params] = await Promise.all([getFullSession(), searchParams])

  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }

  const query: TManagementCompaniesQuery = {
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: params.limit ? parseInt(params.limit, 10) : 10,
    search: params.search || undefined,
    isActive: params.isActive === 'true' ? true : params.isActive === 'false' ? false : undefined,
    hasActiveSubscription: false,
  }

  try {
    const response = await getManagementCompaniesPaginated(session.sessionToken!, query)

    return (
      <NoSubscriptionPageClient
        companies={response.data}
        initialQuery={query}
        pagination={response.pagination}
      />
    )
  } catch (error) {
    console.error('Failed to fetch companies without subscription:', error)

    return (
      <NoSubscriptionPageClient
        companies={[]}
        initialQuery={query}
        pagination={{ total: 0, page: 1, limit: 10, totalPages: 0 }}
      />
    )
  }
}
