import { redirect } from 'next/navigation'

import { StoreHydration } from './components/StoreHydration'
import { SuperadminHydration } from './components/SuperadminHydration'
import { DashboardShell } from './components/DashboardShell'
import { SuperadminShell } from './components/SuperadminShell'
import { PageErrorBoundary } from '@/ui/components/error-boundary'
import { AvatarPreloader } from '@/ui/components/avatar'
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

  // Render appropriate shell based on user type
  if (isSuperadmin) {
    return (
      <>
        <StoreHydration
          condominiums={session.condominiums}
          selectedCondominium={session.selectedCondominium}
          user={session.user}
          superadmin={session.superadmin}
          superadminPermissions={session.superadminPermissions}
          wasFetched={session.wasFetched}
        />
        <AvatarPreloader />
        <SuperadminShell>
          <PageErrorBoundary pageName="Dashboard">{children}</PageErrorBoundary>
        </SuperadminShell>
      </>
    )
  }

  return (
    <>
      <StoreHydration
        condominiums={session.condominiums}
        selectedCondominium={session.selectedCondominium}
        user={session.user}
        wasFetched={session.wasFetched}
      />
      <AvatarPreloader />
      <DashboardShell>
        <PageErrorBoundary pageName="Dashboard">{children}</PageErrorBoundary>
      </DashboardShell>
    </>
  )
}
