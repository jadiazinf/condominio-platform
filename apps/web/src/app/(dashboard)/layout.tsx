import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { StoreHydration } from './components/StoreHydration'
import { DashboardShell } from './components/DashboardShell'
import { SuperadminShell } from './components/SuperadminShell'
import { AdminShell } from './components/AdminShell'
import { DashboardTheme } from './components/DashboardTheme'
import { PageErrorBoundary } from '@/ui/components/error-boundary'
import { getFullSession } from '@/libs/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Get full session data - validates token and fetches/caches user data
  const session = await getFullSession()

  // If user needs to select a role, redirect to role selection
  if (session.needsRoleSelection) {
    redirect('/select-role')
  }

  // If user needs to select a condominium, redirect with current path
  if (session.needsCondominiumSelection) {
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') || '/dashboard'

    // Pass the original destination as redirect parameter (only if not default dashboard)
    if (pathname !== '/dashboard') {
      redirect(`/select-condominium?redirect=${encodeURIComponent(pathname)}`)
    }
    redirect('/select-condominium')
  }

  // Preload avatar image from server to prevent flash
  const avatarPreloadLink = session.user?.photoUrl ? (
    <link rel="preload" as="image" href={session.user.photoUrl} />
  ) : null

  // Common StoreHydration props
  const hydrationProps = {
    condominiums: session.condominiums,
    selectedCondominium: session.selectedCondominium,
    user: session.user,
    superadmin: session.superadmin,
    superadminPermissions: session.superadminPermissions,
    managementCompanies: session.managementCompanies,
    activeRole: session.activeRole,
    wasFetched: session.wasFetched,
  }

  // Render appropriate shell based on active role
  if (session.activeRole === 'superadmin') {
    return (
      <DashboardTheme>
        {avatarPreloadLink}
        <StoreHydration {...hydrationProps} />
        <SuperadminShell initialUser={session.user}>
          <PageErrorBoundary pageName="Dashboard">{children}</PageErrorBoundary>
        </SuperadminShell>
      </DashboardTheme>
    )
  }

  if (session.activeRole === 'management_company') {
    return (
      <DashboardTheme>
        {avatarPreloadLink}
        <StoreHydration {...hydrationProps} />
        <AdminShell initialUser={session.user}>
          <PageErrorBoundary pageName="Dashboard">{children}</PageErrorBoundary>
        </AdminShell>
      </DashboardTheme>
    )
  }

  return (
    <DashboardTheme>
      {avatarPreloadLink}
      <StoreHydration {...hydrationProps} />
      <DashboardShell initialUser={session.user}>
        <PageErrorBoundary pageName="Dashboard">{children}</PageErrorBoundary>
      </DashboardShell>
    </DashboardTheme>
  )
}
