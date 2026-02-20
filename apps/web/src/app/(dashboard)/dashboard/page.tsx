import { Suspense } from 'react'

import type { TAccessRequest } from '@packages/domain'
import { getFullSession, type FullSession } from '@/libs/session'
import { getServerAuthToken } from '@/libs/session/getServerAuthToken'
import { getMyAccessRequests } from '@packages/http-client/hooks'
import { getTranslations } from '@/libs/i18n/server'

import {
  DashboardSkeleton,
  AdminDashboardSkeleton,
  SuperadminDashboardSkeleton,
} from './components/DashboardSkeleton'
import { SuperadminDashboardClient } from './components/SuperadminDashboardClient'
import { AdminDashboardClient } from './components/AdminDashboardClient'
import { ResidentDashboardClient } from './components/ResidentDashboardClient'
import { NewUserDashboardClient } from './components/NewUserDashboardClient'

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

// New user dashboard content (no condominiums assigned)
async function NewUserDashboardContent({ session }: { session: FullSession }) {
  const displayName =
    session.user?.displayName || session.user?.firstName || session.user?.email || ''

  const { t } = await getTranslations()

  let initialRequests: TAccessRequest[] = []

  try {
    const token = await getServerAuthToken()
    const response = await getMyAccessRequests(token)
    initialRequests = response.data
  } catch {
    // If fetch fails, show empty requests — user can refresh
  }

  const translations = {
    welcome: t('dashboard.welcome', { name: displayName }),
    subtitle: t('resident.dashboard.newUser.subtitle'),
    joinTitle: t('resident.dashboard.newUser.joinTitle'),
    joinDescription: t('resident.dashboard.newUser.joinDescription'),
    codePlaceholder: t('resident.joinCondominium.step1.placeholder'),
    validate: t('resident.joinCondominium.step1.validate'),
    validating: t('resident.joinCondominium.step1.validating'),
    invalidCode: t('resident.joinCondominium.step1.invalidCode'),
    profileIncomplete: {
      title: t('resident.joinCondominium.errors.profileIncompleteTitle'),
      message: t('resident.joinCondominium.errors.profileIncompleteMessage'),
      goToSettings: t('resident.joinCondominium.errors.profileIncompleteGoToSettings'),
      close: t('common.close'),
    },
    pendingRequests: t('resident.dashboard.newUser.pendingRequests'),
    noPendingRequests: t('resident.dashboard.newUser.noPendingRequests'),
    viewAllRequests: t('resident.dashboard.newUser.viewAllRequests'),
    status: {
      pending: t('admin.accessRequests.status.pending'),
      approved: t('admin.accessRequests.status.approved'),
      rejected: t('admin.accessRequests.status.rejected'),
    },
    modal: {
      modalTitle: t('resident.joinCondominium.title'),
      unitSelection: {
        condominiumInfo: t('resident.joinCondominium.step2.condominiumInfo'),
        selectUnit: t('resident.joinCondominium.step2.selectUnit'),
        ownershipType: t('resident.joinCondominium.step2.ownershipType'),
        submit: t('resident.joinCondominium.step2.submit'),
        submitting: t('resident.joinCondominium.step2.submitting'),
        ownershipTypes: {
          owner: t('common.ownershipTypes.owner'),
          tenant: t('common.ownershipTypes.tenant'),
          family_member: t('common.ownershipTypes.family_member'),
          authorized: t('common.ownershipTypes.authorized'),
        },
      },
      success: {
        title: t('resident.joinCondominium.step3.title'),
        message: t('resident.joinCondominium.step3.message'),
        submitAnother: t('resident.joinCondominium.step3.submitAnother'),
        viewRequests: t('resident.joinCondominium.step3.viewRequests'),
      },
      errors: {
        submitFailed: t('resident.joinCondominium.errors.submitFailed'),
        alreadyHasOwnership: t('resident.joinCondominium.errors.alreadyHasOwnership'),
        alreadyHasPendingRequest: t('resident.joinCondominium.errors.alreadyHasPendingRequest'),
        accessCodeInactive: t('resident.joinCondominium.errors.accessCodeInactive'),
        accessCodeExpired: t('resident.joinCondominium.errors.accessCodeExpired'),
        unitNotInCondominium: t('resident.joinCondominium.errors.unitNotInCondominium'),
      },
    },
  }

  return (
    <NewUserDashboardClient
      displayName={displayName}
      initialRequests={initialRequests}
      translations={translations}
    />
  )
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

  const hasNoCondominiums = (session.condominiums ?? []).length === 0

  if (hasNoCondominiums) {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <NewUserDashboardContent session={session} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RegularDashboardContent session={session} />
    </Suspense>
  )
}
