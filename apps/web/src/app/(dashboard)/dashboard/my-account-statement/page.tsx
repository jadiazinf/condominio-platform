import { redirect } from 'next/navigation'

import { AccountStatementClient } from './components/AccountStatementClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

interface PageProps {
  searchParams: Promise<{
    unitId?: string
    from?: string
    to?: string
  }>
}

export default async function MyAccountStatementPage({ searchParams }: PageProps) {
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

  const selectedUnitId =
    sp.unitId && allUnits.some(u => u.id === sp.unitId) ? sp.unitId : allUnits[0]!.id

  const p = 'resident.myAccountStatement'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    selectUnit: t(`${p}.selectUnit`),
    from: t(`${p}.from`),
    to: t(`${p}.to`),
    search: t(`${p}.search`),
    loading: t(`${p}.loading`),
    error: t(`${p}.error`),
    empty: t(`${p}.empty`),
    summary: {
      previousBalance: t(`${p}.summary.previousBalance`),
      totalCharges: t(`${p}.summary.totalCharges`),
      totalPayments: t(`${p}.summary.totalPayments`),
      totalInterest: t(`${p}.summary.totalInterest`),
      currentBalance: t(`${p}.summary.currentBalance`),
    },
    aging: {
      title: t(`${p}.aging.title`),
      current: t(`${p}.aging.current`),
      days30: t(`${p}.aging.days30`),
      days60: t(`${p}.aging.days60`),
      days90Plus: t(`${p}.aging.days90Plus`),
    },
    lineItems: {
      title: t(`${p}.lineItems.title`),
      date: t(`${p}.lineItems.date`),
      description: t(`${p}.lineItems.description`),
      type: t(`${p}.lineItems.type`),
      amount: t(`${p}.lineItems.amount`),
      balance: t(`${p}.lineItems.balance`),
      types: {
        charge: t(`${p}.lineItems.types.charge`),
        payment: t(`${p}.lineItems.types.payment`),
        interest: t(`${p}.lineItems.types.interest`),
        adjustment: t(`${p}.lineItems.types.adjustment`),
      },
    },
  }

  return (
    <AccountStatementClient
      allUnits={allUnits}
      initialFrom={sp.from ?? ''}
      initialTo={sp.to ?? ''}
      selectedUnitId={selectedUnitId}
      translations={translations}
    />
  )
}
