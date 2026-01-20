import { StoreHydration } from './components/StoreHydration'
import { DashboardShell } from './components/DashboardShell'

import { getAuthenticatedSession } from '@/libs/firebase/server'
import {
  getUserCookieServer,
  getCondominiumsCookieServer,
  getSelectedCondominiumCookieServer,
} from '@/libs/cookies/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Get user from authenticated session (validates token)
  const { user: sessionUser } = await getAuthenticatedSession()

  // Get data from cookies (set by loading page)
  const [cookieUser, condominiums, selectedCondominium] = await Promise.all([
    getUserCookieServer(),
    getCondominiumsCookieServer(),
    getSelectedCondominiumCookieServer(),
  ])

  // Prefer cookie user if available, fallback to session user
  const user = cookieUser ?? sessionUser

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
