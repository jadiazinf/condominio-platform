import { redirect } from 'next/navigation'

import { DelinquencyReportClient } from './components/DelinquencyReportClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface PageProps {
  searchParams: Promise<{
    asOfDate?: string
    buildingId?: string
  }>
}

export default async function DelinquencyReportPage({ searchParams }: PageProps) {
  const [sp, { t }, session] = await Promise.all([
    searchParams,
    getTranslations(),
    getFullSession(),
  ])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const condominiums = session.condominiums ?? []

  if (condominiums.length === 0) {
    redirect('/dashboard')
  }

  const condominiumId =
    session.selectedCondominium?.condominium.id ?? condominiums[0]?.condominium.id

  if (!condominiumId) {
    redirect('/dashboard')
  }

  const p = 'admin.delinquencyReport'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    asOfDate: t(`${p}.asOfDate`),
    filterByBuilding: t(`${p}.filterByBuilding`),
    allBuildings: t(`${p}.allBuildings`),
    search: t(`${p}.search`),
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
      translations={translations}
    />
  )
}
