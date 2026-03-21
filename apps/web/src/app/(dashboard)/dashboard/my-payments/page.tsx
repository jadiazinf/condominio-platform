import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getPaymentsByUserPaginated } from '@packages/http-client'

import { MyPaymentsContent } from './components/MyPaymentsContent'

import { Typography } from '@/ui/components/typography'
import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface IMyPaymentsPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    status?: string
    startDate?: string
    endDate?: string
  }>
}

async function MyPaymentsData({ searchParams }: IMyPaymentsPageProps) {
  const [{ t }, session, params] = await Promise.all([
    getTranslations(),
    getFullSession(),
    searchParams,
  ])

  if (!session.condominiums?.length) {
    redirect('/dashboard')
  }

  const page = params.page ? Number(params.page) : 1
  const limit = params.limit ? Number(params.limit) : 20
  const status = params.status || undefined
  const startDate = params.startDate || undefined
  const endDate = params.endDate || undefined

  const condominiumId =
    session.selectedCondominium?.condominium.id ?? session.condominiums[0]?.condominium.id
  const managementCompanyId = session.managementCompanies?.[0]?.managementCompanyId

  const result = await getPaymentsByUserPaginated(
    session.sessionToken,
    session.user.id,
    { page, limit, status, startDate, endDate },
    condominiumId,
    managementCompanyId
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Typography variant="h2">{t('resident.myPayments.title')}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('resident.myPayments.subtitle')}
        </Typography>
      </div>

      {/* Filters + Table */}
      <MyPaymentsContent
        currentFilters={{
          status: status ?? '',
          startDate: startDate ?? '',
          endDate: endDate ?? '',
        }}
        pagination={result.pagination}
        payments={result.data}
      />
    </div>
  )
}

export default async function MyPaymentsPage(props: IMyPaymentsPageProps) {
  return (
    <Suspense fallback={<MyPaymentsPageSkeleton />}>
      <MyPaymentsData {...props} />
    </Suspense>
  )
}

function MyPaymentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-64 animate-pulse rounded bg-default-200" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-default-200" />
      </div>
      <div className="h-12 animate-pulse rounded-lg bg-default-200" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-default-200" />
        ))}
      </div>
    </div>
  )
}
