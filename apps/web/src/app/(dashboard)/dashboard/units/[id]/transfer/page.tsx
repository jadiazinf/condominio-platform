import { redirect } from 'next/navigation'
import { getUnitDetail, getUnitOwnerships } from '@packages/http-client/hooks'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { TransferOwnershipClient } from './components/TransferOwnershipClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TransferOwnershipPage({ params }: PageProps) {
  const [{ id: unitId }, token, session] = await Promise.all([
    params,
    getServerAuthToken(),
    getFullSession(),
  ])

  if (!session.sessionToken) redirect('/auth')

  const managementCompanyId =
    session?.activeRole === 'management_company'
      ? session.managementCompanies?.[0]?.managementCompanyId
      : undefined

  const condominiumId = session.condominiums?.[0]?.condominium?.id

  let unit = null
  let ownerships: Array<{
    userId: string
    user?: { displayName?: string | null; email?: string | null } | null
    ownershipType: string
  }> = []

  try {
    const results = await Promise.allSettled([
      getUnitDetail(token, unitId, condominiumId, managementCompanyId),
      getUnitOwnerships(token, unitId, condominiumId, managementCompanyId),
    ])

    if (results[0].status === 'fulfilled') unit = results[0].value
    if (results[1].status === 'fulfilled') ownerships = results[1].value as typeof ownerships
  } catch (error) {
    console.error('Failed to fetch unit data:', error)
  }

  if (!unit) {
    return (
      <div className="py-12 text-center">
        <Typography color="muted">Unidad no encontrada</Typography>
      </div>
    )
  }

  const currentOwners = ownerships.map((o) => ({
    userId: o.userId,
    displayName: o.user?.displayName ?? null,
    email: o.user?.email ?? null,
    ownershipType: o.ownershipType,
  }))

  return (
    <TransferOwnershipClient
      unitId={unitId}
      unitNumber={unit.unitNumber}
      buildingName={(unit as any).building?.name ?? null}
      currentOwners={currentOwners}
    />
  )
}
