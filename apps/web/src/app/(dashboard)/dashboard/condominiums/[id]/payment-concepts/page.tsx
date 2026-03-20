import type { TPaymentConceptsQuery } from '@packages/domain'

import { getMyCompanyPaymentConceptsPaginated } from '@packages/http-client'
import { redirect } from 'next/navigation'

import { PaymentConceptsPageClient } from './components/PaymentConceptsPageClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    conceptType?: string
    isActive?: string
  }>
}

export default async function CondominiumPaymentConceptsPage({ params, searchParams }: PageProps) {
  const [{ id }, sp, { t }, session] = await Promise.all([
    params,
    searchParams,
    getTranslations(),
    getFullSession(),
  ])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const managementCompanyId =
    session?.activeRole === 'management_company'
      ? (session.managementCompanies?.[0]?.managementCompanyId ?? '')
      : ''

  // Build query from URL search params
  // Default: isActive=true (show active). "all" = no filter. "false" = inactive only.
  const query: TPaymentConceptsQuery = {
    page: sp.page ? parseInt(sp.page, 10) : 1,
    limit: sp.limit ? parseInt(sp.limit, 10) : 10,
    search: sp.search || undefined,
    conceptType: sp.conceptType || undefined,
    condominiumId: id,
    isActive: sp.isActive === 'all' ? undefined : sp.isActive === 'false' ? false : true,
  }

  const p = 'admin.condominiums.detail.paymentConcepts'

  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    empty: t(`${p}.empty`),
    emptyDescription: t(`${p}.emptyDescription`),
    addConcept: t(`${p}.addConcept`),
    table: {
      name: t(`${p}.table.name`),
      type: t(`${p}.table.type`),
      recurring: t(`${p}.table.recurring`),
      recurrence: t(`${p}.table.recurrence`),
      status: t(`${p}.table.status`),
      createdAt: t(`${p}.table.createdAt`),
    },
    types: {
      maintenance: t(`${p}.types.maintenance`),
      condominium_fee: t(`${p}.types.condominiumFee`),
      extraordinary: t(`${p}.types.extraordinary`),
      fine: t(`${p}.types.fine`),
      reserve_fund: t(`${p}.types.reserveFund`),
      other: t(`${p}.types.other`),
    },
    recurrence: {
      monthly: t(`${p}.recurrence.monthly`),
      quarterly: t(`${p}.recurrence.quarterly`),
      yearly: t(`${p}.recurrence.yearly`),
    },
    yes: t('common.yes'),
    no: t('common.no'),
    status: {
      active: t('common.status.active'),
      inactive: t('common.status.inactive'),
    },
    filters: {
      allTypes: t(`${p}.filters.allTypes`),
      allStatuses: t(`${p}.filters.allStatuses`),
      active: t(`${p}.filters.active`),
      inactive: t(`${p}.filters.inactive`),
      searchPlaceholder: t(`${p}.filters.searchPlaceholder`),
    },
    noResults: t(`${p}.noResults`),
    noResultsHint: t(`${p}.noResultsHint`),
  }

  try {
    const response = await getMyCompanyPaymentConceptsPaginated(
      session.sessionToken,
      managementCompanyId,
      id,
      query
    )

    return (
      <PaymentConceptsPageClient
        condominiumId={id}
        initialQuery={query}
        managementCompanyId={managementCompanyId}
        pagination={response.pagination}
        paymentConcepts={response.data}
        translations={translations}
      />
    )
  } catch (error) {
    console.error('Failed to fetch payment concepts:', error)

    return (
      <PaymentConceptsPageClient
        condominiumId={id}
        initialQuery={query}
        managementCompanyId={managementCompanyId}
        pagination={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
        paymentConcepts={[]}
        translations={translations}
      />
    )
  }
}
