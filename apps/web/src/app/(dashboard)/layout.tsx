import { redirect } from 'next/navigation'

import { StoreHydration } from './components/StoreHydration'
import { DashboardShell } from './components/DashboardShell'
import { SuperadminShell } from './components/SuperadminShell'
import { PageErrorBoundary } from '@/ui/components/error-boundary'
import { getFullSession } from '@/libs/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Get full session data - validates token and fetches/caches user data
  const session = await getFullSession()

  // If user needs to select a condominium, redirect
  if (session.needsCondominiumSelection) {
    redirect('/select-condominium')
  }

  // Determine if user is a superadmin
  const isSuperadmin = session.superadmin?.isActive === true

  // Preload avatar image from server to prevent flash
  const avatarPreloadLink = session.user?.photoUrl ? (
    <link rel="preload" as="image" href={session.user.photoUrl} />
  ) : null

  // Render appropriate shell based on user type
  if (isSuperadmin) {
    return (
      <>
        {avatarPreloadLink}
        <StoreHydration
          condominiums={session.condominiums}
          selectedCondominium={session.selectedCondominium}
          user={session.user}
          superadmin={session.superadmin}
          superadminPermissions={session.superadminPermissions}
          wasFetched={session.wasFetched}
        />
        <SuperadminShell initialUser={session.user}>
          <PageErrorBoundary pageName="Dashboard">{children}</PageErrorBoundary>
        </SuperadminShell>
      </>
    )
  }

  return (
    <>
      {avatarPreloadLink}
      <StoreHydration
        condominiums={session.condominiums}
        selectedCondominium={session.selectedCondominium}
        user={session.user}
        wasFetched={session.wasFetched}
      />
      <DashboardShell initialUser={session.user}>
        <PageErrorBoundary pageName="Dashboard">{children}</PageErrorBoundary>
      </DashboardShell>
    </>
  )
}
