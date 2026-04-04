import { redirect } from 'next/navigation'

import { MyStatementClient } from './components/MyStatementClient'

import { getFullSession } from '@/libs/session'

interface PageProps {
  searchParams: Promise<{
    unitId?: string
  }>
}

export default async function MyStatementPage({ searchParams }: PageProps) {
  const [sp, session] = await Promise.all([
    searchParams,
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

  return (
    <MyStatementClient
      allUnits={allUnits}
      selectedUnitId={selectedUnitId}
    />
  )
}
