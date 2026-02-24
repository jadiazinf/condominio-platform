import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { ServicesPageClient } from './components/ServicesPageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumServicesPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId ?? ''
    : ''

  const w = 'admin.condominiums.detail.services'

  const translations = {
    title: t(`${w}.title`),
    subtitle: t(`${w}.subtitle`),
    empty: t(`${w}.empty`),
    emptyDescription: t(`${w}.emptyDescription`),
    addService: t(`${w}.addService`),
    table: {
      name: t(`${w}.table.name`),
      providerType: t(`${w}.table.providerType`),
      contact: t(`${w}.table.contact`),
      defaultAmount: t(`${w}.table.defaultAmount`),
      status: t(`${w}.table.status`),
    },
    providerTypes: {
      individual: t(`${w}.providerTypes.individual`),
      company: t(`${w}.providerTypes.company`),
      cooperative: t(`${w}.providerTypes.cooperative`),
      government: t(`${w}.providerTypes.government`),
      internal: t(`${w}.providerTypes.internal`),
    },
    filters: {
      allTypes: t(`${w}.filters.allTypes`),
      allStatuses: t(`${w}.filters.allStatuses`),
      active: t(`${w}.filters.active`),
      inactive: t(`${w}.filters.inactive`),
      searchPlaceholder: t(`${w}.filters.searchPlaceholder`),
    },
    noResults: t(`${w}.noResults`),
    noResultsHint: t(`${w}.noResultsHint`),
    status: {
      active: t('common.status.active'),
      inactive: t('common.status.inactive'),
    },
  }

  return (
    <ServicesPageClient
      condominiumId={id}
      managementCompanyId={managementCompanyId}
      translations={translations}
    />
  )
}
