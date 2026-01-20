import type { TUser, TUserCondominiumAccess } from '@packages/domain'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { fetchUserByFirebaseUid, fetchUserCondominiums } from '@packages/http-client'

import { ClientLoadingFlow } from './components/ClientLoadingFlow'
import { CondominiumHydration } from './components/CondominiumHydration'
import { RedirectToDashboard } from './components/RedirectToDashboard'
import { RedirectToSelectCondominium } from './components/RedirectToSelectCondominium'

import { verifySessionToken } from '@/libs/firebase/server'
import { UserHydration } from '@/app/(dashboard)/components/UserHydration'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ILoadingPageProps {
  searchParams: Promise<{ register?: string; signout?: string }>
}

interface ISearchParams {
  register?: string
  signout?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function isClientSideFlow(params: ISearchParams): boolean {
  return params.register === 'true' || params.signout === 'true'
}

async function getSessionToken(): Promise<string> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('__session')?.value

  if (!sessionToken) {
    redirect('/signin')
  }

  return sessionToken
}

async function validateSessionToken(sessionToken: string): Promise<string> {
  const decodedToken = await verifySessionToken(sessionToken)

  if (!decodedToken) {
    redirect('/signin?expired=true')
  }

  return decodedToken.uid
}

async function fetchUser(firebaseUid: string, sessionToken: string): Promise<TUser> {
  const user = await fetchUserByFirebaseUid(firebaseUid, sessionToken)

  if (!user) {
    redirect('/signup')
  }

  return user
}

async function fetchCondominiums(sessionToken: string): Promise<TUserCondominiumAccess[]> {
  const response = await fetchUserCondominiums(sessionToken)

  if (!response) {
    redirect('/signin')
  }

  return response.condominiums
}

// ─────────────────────────────────────────────────────────────────────────────
// Render Functions
// ─────────────────────────────────────────────────────────────────────────────

function renderWithDashboardRedirect(
  user: TUser,
  condominiums: TUserCondominiumAccess[],
  selectedCondominium: TUserCondominiumAccess | null
) {
  return (
    <>
      <UserHydration user={user} />
      <CondominiumHydration condominiums={condominiums} selectedCondominium={selectedCondominium} />
      <RedirectToDashboard />
    </>
  )
}

function renderWithSelectionRedirect(user: TUser, condominiums: TUserCondominiumAccess[]) {
  return (
    <>
      <UserHydration user={user} />
      <CondominiumHydration condominiums={condominiums} selectedCondominium={null} />
      <RedirectToSelectCondominium />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default async function AuthLoadingPage({ searchParams }: ILoadingPageProps) {
  const params = await searchParams

  // Special cases: delegate to Client Component
  // Registration requires sessionStorage, signout requires Firebase client SDK
  if (isClientSideFlow(params)) {
    return <ClientLoadingFlow />
  }

  // Server-side flow
  const sessionToken = await getSessionToken()
  const firebaseUid = await validateSessionToken(sessionToken)
  const user = await fetchUser(firebaseUid, sessionToken)
  const condominiums = await fetchCondominiums(sessionToken)

  // Determine destination based on condominium count
  if (condominiums.length === 0) {
    return renderWithDashboardRedirect(user, [], null)
  }

  if (condominiums.length === 1) {
    return renderWithDashboardRedirect(user, condominiums, condominiums[0])
  }

  return renderWithSelectionRedirect(user, condominiums)
}
