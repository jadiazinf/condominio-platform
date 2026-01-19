import { UserHydration } from './components/UserHydration'
import { DashboardShell } from './components/DashboardShell'

import { getAuthenticatedSession } from '@/libs/firebase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getAuthenticatedSession()

  return (
    <>
      <UserHydration user={user} />
      <DashboardShell>{children}</DashboardShell>
    </>
  )
}
