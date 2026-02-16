import { Suspense } from 'react'

import { getFullSession, type FullSession } from '@/libs/session'

import {
  DashboardSkeleton,
  AdminDashboardSkeleton,
  SuperadminDashboardSkeleton,
} from './components/DashboardSkeleton'
import { SuperadminDashboardClient } from './components/SuperadminDashboardClient'
import { AdminDashboardClient } from './components/AdminDashboardClient'
import { ResidentDashboardClient } from './components/ResidentDashboardClient'

// Regular user dashboard content
function RegularDashboardContent({ session }: { session: FullSession }) {
  const displayName =
    session.user?.displayName || session.user?.firstName || session.user?.email || ''

  const selectedCondominium = session.selectedCondominium

  // Collect unit IDs from all condominiums the user has access to
  const unitIds = (session.condominiums ?? []).flatMap(c => c.units.map(u => u.unit.id))

  return (
    <ResidentDashboardClient
      condominiumName={selectedCondominium?.condominium.name}
      displayName={displayName}
      unitIds={unitIds}
      userId={session.user.id}
    />
  )
}

// Management company admin dashboard content
function AdminDashboardContent({ session }: { session: FullSession }) {
  const displayName = session.user?.displayName || session.user?.firstName || 'Admin'
  const companyName = session.managementCompanies?.[0]?.managementCompanyName

  return <AdminDashboardClient companyName={companyName} displayName={displayName} />
}

// Superadmin dashboard content
function SuperadminDashboardContent({ session }: { session: FullSession }) {
  const displayName = session.user?.displayName || session.user?.firstName || 'Admin'

  return <SuperadminDashboardClient displayName={displayName} />
}

export default async function DashboardPage() {
  const session = await getFullSession()
  const isSuperadmin = session.superadmin?.isActive === true
  const isAdmin = session.activeRole === 'management_company'

  if (isSuperadmin) {
    return (
      <Suspense fallback={<SuperadminDashboardSkeleton />}>
        <SuperadminDashboardContent session={session} />
      </Suspense>
    )
  }

  if (isAdmin) {
    return (
      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardContent session={session} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RegularDashboardContent session={session} />
    </Suspense>
  )
}
