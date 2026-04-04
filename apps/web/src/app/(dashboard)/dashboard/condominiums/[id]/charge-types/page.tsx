import { ChargeTypesClient } from './components/ChargeTypesClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumChargeTypesPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const managementCompanyId =
    session?.activeRole === 'management_company'
      ? (session.managementCompanies?.[0]?.managementCompanyId ?? '')
      : ''

  const p = 'admin.condominiums.detail.chargeTypes'

  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    create: t(`${p}.create`),
    empty: t(`${p}.empty`),
    emptyDescription: t(`${p}.emptyDescription`),
    table: {
      name: t(`${p}.table.name`),
      category: t(`${p}.table.category`),
      actions: t(`${p}.table.actions`),
    },
    categories: {
      ordinary: t(`${p}.categories.ordinary`),
      extraordinary: t(`${p}.categories.extraordinary`),
      reserve_fund: t(`${p}.categories.reserve_fund`),
      social_benefits: t(`${p}.categories.social_benefits`),
      non_common: t(`${p}.categories.non_common`),
      fine: t(`${p}.categories.fine`),
      other: t(`${p}.categories.other`),
    },
    form: {
      name: t(`${p}.form.name`),
      namePlaceholder: t(`${p}.form.namePlaceholder`),
      category: t(`${p}.form.category`),
      categoryPlaceholder: t(`${p}.form.categoryPlaceholder`),
      create: t(`${p}.form.create`),
      update: t(`${p}.form.update`),
    },
    deleteConfirm: t(`${p}.deleteConfirm`),
  }

  return (
    <ChargeTypesClient
      condominiumId={id}
      managementCompanyId={managementCompanyId}
      translations={translations}
    />
  )
}
