import type { IQuotasByUnitQuery } from '@packages/http-client'

import { redirect } from 'next/navigation'
import {
  getQuotasByUnitPaginatedServer,
  getDistinctConceptsByUnitServer,
} from '@packages/http-client'

import { MyQuotasClient } from './components/MyQuotasClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface PageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    status?: string
    unitId?: string
    startDate?: string
    endDate?: string
    conceptId?: string
  }>
}

export default async function MyQuotasPage({ searchParams }: PageProps) {
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

  // Collect all units with their info for the unit selector
  const allUnits = condominiums.flatMap(c =>
    c.units.map(u => ({
      id: u.unit.id,
      unitNumber: u.unit.unitNumber,
      buildingName: u.building?.name ?? '',
      condominiumId: c.condominium.id,
      condominiumName: c.condominium.name,
    }))
  )

  if (allUnits.length === 0) {
    redirect('/dashboard')
  }

  // Determine which unit to fetch quotas for
  const selectedUnitId =
    sp.unitId && allUnits.some(u => u.id === sp.unitId) ? sp.unitId : allUnits[0]!.id

  const selectedUnit = allUnits.find(u => u.id === selectedUnitId)!

  // Build query from URL search params
  const query: IQuotasByUnitQuery = {
    page: sp.page ? Math.max(1, parseInt(sp.page, 10)) : 1,
    limit: sp.limit ? Math.min(100, Math.max(1, parseInt(sp.limit, 10))) : 10,
    status: sp.status || undefined,
    startDate: sp.startDate || undefined,
    endDate: sp.endDate || undefined,
    conceptId: sp.conceptId || undefined,
  }

  // Build translations
  const p = 'resident.myQuotas'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    empty: t(`${p}.empty`),
    concept: t(`${p}.concept`),
    period: t(`${p}.period`),
    amount: t(`${p}.amount`),
    dueDate: t(`${p}.dueDate`),
    balance: t(`${p}.balance`),
    unit: t(`${p}.unit`),
    issueDate: t(`${p}.issueDate`),
    totalPending: t(`${p}.totalPending`),
    overdueCount: t(`${p}.overdueCount`),
    paidThisMonth: t(`${p}.paidThisMonth`),
    filter: {
      all: t(`${p}.filter.all`),
      pending: t(`${p}.filter.pending`),
      partial: t(`${p}.filter.partial`),
      overdue: t(`${p}.filter.overdue`),
      paid: t(`${p}.filter.paid`),
      cancelled: t(`${p}.filter.cancelled`),
      exonerated: t(`${p}.filter.exonerated`),
    },
    status: {
      pending: t(`${p}.status.pending`),
      partial: t(`${p}.status.partial`),
      overdue: t(`${p}.status.overdue`),
      paid: t(`${p}.status.paid`),
      cancelled: t(`${p}.status.cancelled`),
      exonerated: t(`${p}.status.exonerated`),
    },
    export: {
      csv: t(`${p}.export.csv`),
      pdf: t(`${p}.export.pdf`),
      success: t(`${p}.export.success`),
      error: t(`${p}.export.error`),
    },
  }

  try {
    const [response, concepts] = await Promise.all([
      getQuotasByUnitPaginatedServer(
        session.sessionToken,
        selectedUnitId,
        query,
        selectedUnit.condominiumId
      ),
      getDistinctConceptsByUnitServer(
        session.sessionToken,
        selectedUnitId,
        selectedUnit.condominiumId
      ),
    ])

    return (
      <MyQuotasClient
        allUnits={allUnits}
        concepts={concepts}
        initialQuery={query}
        pagination={response.pagination}
        quotas={response.data}
        selectedUnitId={selectedUnitId}
        translations={translations}
      />
    )
  } catch (error) {
    console.error('Failed to fetch quotas:', error)

    return (
      <MyQuotasClient
        allUnits={allUnits}
        concepts={[]}
        initialQuery={query}
        pagination={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
        quotas={[]}
        selectedUnitId={selectedUnitId}
        translations={translations}
      />
    )
  }
}
