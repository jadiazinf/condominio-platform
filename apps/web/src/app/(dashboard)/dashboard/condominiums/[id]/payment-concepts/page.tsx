import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { PaymentConceptsPageClient } from './components/PaymentConceptsPageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumPaymentConceptsPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId ?? ''
    : ''

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

  return (
    <PaymentConceptsPageClient
      condominiumId={id}
      managementCompanyId={managementCompanyId}
      translations={translations}
    />
  )
}
