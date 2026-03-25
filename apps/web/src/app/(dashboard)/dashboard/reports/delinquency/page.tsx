import { redirect } from 'next/navigation'
import { getCompanyCondominiums } from '@packages/http-client/hooks'

import { DelinquencyReportClient } from './components/DelinquencyReportClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession, getServerAuthToken } from '@/libs/session'

interface PageProps {
  searchParams: Promise<{
    asOfDate?: string
    buildingId?: string
  }>
}

export default async function DelinquencyReportPage({ searchParams }: PageProps) {
  const [sp, { t }, session, token] = await Promise.all([
    searchParams,
    getTranslations(),
    getFullSession(),
    getServerAuthToken(),
  ])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  // For management company admins, get condominiums from company data
  let condominiumId: string | undefined
  const isAdmin = session.activeRole === 'management_company'

  if (isAdmin) {
    const companyId = session.managementCompanies?.[0]?.managementCompanyId

    if (!companyId) {
      redirect('/dashboard')
    }

    try {
      const companyCondominiums = await getCompanyCondominiums(token, companyId)

      condominiumId = companyCondominiums?.[0]?.id
    } catch {
      // If fetch fails, redirect
    }
  } else {
    // For residents, use session condominiums
    const condominiums = session.condominiums ?? []

    condominiumId = session.selectedCondominium?.condominium.id ?? condominiums[0]?.condominium.id
  }

  if (!condominiumId) {
    redirect('/dashboard')
  }

  const managementCompanyId = isAdmin
    ? session.managementCompanies?.[0]?.managementCompanyId
    : undefined

  const p = 'admin.delinquencyReport'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    asOfDate: t(`${p}.asOfDate`),
    filterByBuilding: t(`${p}.filterByBuilding`),
    allBuildings: t(`${p}.allBuildings`),
    filterByConcept: t(`${p}.filterByConcept`),
    allConcepts: t(`${p}.allConcepts`),
    filterByUnit: t(`${p}.filterByUnit`),
    allUnits: t(`${p}.allUnits`),
    search: t(`${p}.search`),
    exportPdf: t(`${p}.exportPdf`),
    loading: t(`${p}.loading`),
    error: t(`${p}.error`),
    empty: t(`${p}.empty`),
    summary: {
      title: t(`${p}.summary.title`),
      totalDelinquent: t(`${p}.summary.totalDelinquent`),
      delinquentUnits: t(`${p}.summary.delinquentUnits`),
      totalUnits: t(`${p}.summary.totalUnits`),
      collectionRate: t(`${p}.summary.collectionRate`),
    },
    table: {
      unit: t(`${p}.table.unit`),
      building: t(`${p}.table.building`),
      totalDebt: t(`${p}.table.totalDebt`),
      overdueQuotas: t(`${p}.table.overdueQuotas`),
      oldestDueDate: t(`${p}.table.oldestDueDate`),
      current: t(`${p}.table.current`),
      days30: t(`${p}.table.days30`),
      days60: t(`${p}.table.days60`),
      days90Plus: t(`${p}.table.days90Plus`),
    },
  }

  return (
    <DelinquencyReportClient
      condominiumId={condominiumId}
      initialAsOfDate={sp.asOfDate ?? ''}
      initialBuildingId={sp.buildingId ?? ''}
      managementCompanyId={managementCompanyId}
      translations={translations}
    />
  )
}
