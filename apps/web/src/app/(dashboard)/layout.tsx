import { StoreHydration } from './components/StoreHydration'
import { SuperadminHydration } from './components/SuperadminHydration'
import { DashboardShell } from './components/DashboardShell'
import { SuperadminShell } from './components/SuperadminShell'

import { getAuthenticatedSession } from '@/libs/firebase/server'
import {
  getUserCookieServer,
  getCondominiumsCookieServer,
  getSelectedCondominiumCookieServer,
  getSuperadminCookieServer,
  getSuperadminPermissionsCookieServer,
} from '@/libs/cookies/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Get user from authenticated session (validates token)
  const { user: sessionUser } = await getAuthenticatedSession()

  // Get data from cookies (set by loading page)
  const [cookieUser, condominiums, selectedCondominium, superadmin, superadminPermissions] =
    await Promise.all([
      getUserCookieServer(),
      getCondominiumsCookieServer(),
      getSelectedCondominiumCookieServer(),
      getSuperadminCookieServer(),
      getSuperadminPermissionsCookieServer(),
    ])

  // Prefer cookie user if available, fallback to session user
  const user = cookieUser ?? sessionUser

  // Determine if user is a superadmin
  const isSuperadmin = superadmin?.isActive === true

  // Render appropriate shell based on user type
  if (isSuperadmin) {
    return (
      <>
        <StoreHydration
          condominiums={condominiums ?? []}
          selectedCondominium={selectedCondominium}
          user={user}
        />
        <SuperadminHydration
          superadmin={superadmin}
          permissions={superadminPermissions ?? []}
        />
        <SuperadminShell>{children}</SuperadminShell>
      </>
    )
  }

  return (
    <>
      <StoreHydration
        condominiums={condominiums ?? []}
        selectedCondominium={selectedCondominium}
        user={user}
      />
      <DashboardShell>{children}</DashboardShell>
    </>
  )
}
