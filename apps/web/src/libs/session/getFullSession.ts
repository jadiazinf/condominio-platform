import type { TUser, TUserCondominiumAccess, TSuperadminUser, TPermission } from '@packages/domain'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  fetchUserByFirebaseUid,
  syncUserFirebaseUid,
  FetchUserError,
  fetchUserCondominiums,
  fetchSuperadminSession,
} from '@packages/http-client'

import { verifySessionToken } from '@/libs/firebase/server'
import {
  getUserCookieServer,
  getCondominiumsCookieServer,
  getSelectedCondominiumCookieServer,
  getSuperadminCookieServer,
  getSuperadminPermissionsCookieServer,
} from '@/libs/cookies/server'

const SESSION_COOKIE_NAME = '__session'

export interface FullSession {
  user: TUser
  condominiums: TUserCondominiumAccess[]
  selectedCondominium: TUserCondominiumAccess | null
  superadmin: TSuperadminUser | null
  superadminPermissions: TPermission[]
  sessionToken: string
  needsCondominiumSelection: boolean
  /** True if data was freshly fetched from API (not from cookies) - client should update cookies */
  wasFetched: boolean
}

/**
 * Gets the full session data for the dashboard.
 *
 * This function:
 * 1. Validates the session token
 * 2. Gets user data from cookies or fetches from API
 * 3. Gets condominiums from cookies or fetches from API
 * 4. Gets superadmin data if applicable
 * 5. Sets cookies for any data that was fetched from API
 *
 * If user has multiple condominiums and none is selected, sets needsCondominiumSelection to true.
 * If session is invalid, redirects to signin.
 * If user doesn't exist, redirects to signup.
 */
export async function getFullSession(): Promise<FullSession> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    redirect('/signin')
  }

  const decodedToken = await verifySessionToken(sessionToken)

  if (!decodedToken) {
    redirect('/signin?expired=true')
  }

  // Try to get all data from cookies first
  const [
    cookieUser,
    cookieCondominiums,
    cookieSelectedCondominium,
    cookieSuperadmin,
    cookiePermissions,
  ] = await Promise.all([
    getUserCookieServer(),
    getCondominiumsCookieServer(),
    getSelectedCondominiumCookieServer(),
    getSuperadminCookieServer(),
    getSuperadminPermissionsCookieServer(),
  ])

  // Validate that cached user matches current session
  const validCachedUser =
    cookieUser && cookieUser.firebaseUid === decodedToken.uid ? cookieUser : null

  // Determine what needs to be fetched
  const needsFetch = !validCachedUser || cookieCondominiums === null

  let user: TUser
  let condominiums: TUserCondominiumAccess[]
  let superadmin: TSuperadminUser | null = cookieSuperadmin
  let superadminPermissions: TPermission[] = cookiePermissions ?? []

  if (needsFetch) {
    // Fetch user from API by Firebase UID
    let fetchedUser: TUser | null = null

    try {
      fetchedUser = await fetchUserByFirebaseUid(decodedToken.uid, sessionToken)
    } catch (error) {
      // Handle retryable errors (429, 5xx) - redirect to signin with error
      if (error instanceof FetchUserError && error.isRetryable) {
        redirect('/signin?error=temporary')
      }
      // For other errors, continue to try sync by email
    }

    // If user not found by Firebase UID, try to sync by email
    // This handles cases where the user exists with a different Firebase UID
    // (e.g., testing across different environments or Firebase projects)
    if (!fetchedUser && decodedToken.email) {
      fetchedUser = await syncUserFirebaseUid(decodedToken.email, decodedToken.uid, sessionToken)
    }

    if (!fetchedUser) {
      redirect('/signup')
    }

    user = fetchedUser

    // Fetch condominiums and superadmin in parallel
    const [condominiumsResponse, superadminSession] = await Promise.all([
      fetchUserCondominiums(sessionToken),
      fetchSuperadminSession(fetchedUser.id, sessionToken),
    ])

    condominiums = condominiumsResponse?.condominiums ?? []
    superadmin = superadminSession?.superadmin ?? null
    superadminPermissions = superadminSession?.permissions ?? []

    // Note: We don't set cookies here because Server Components cannot set cookies.
    // The client-side StoreHydration component will update cookies when wasFetched=true.
  } else {
    user = validCachedUser!
    condominiums = cookieCondominiums ?? []
  }

  const selectedCondominium =
    cookieSelectedCondominium ?? (condominiums.length === 1 ? condominiums[0] : null)
  const needsCondominiumSelection = condominiums.length > 1 && !selectedCondominium

  return {
    user,
    condominiums,
    selectedCondominium,
    superadmin,
    superadminPermissions,
    sessionToken,
    needsCondominiumSelection,
    wasFetched: needsFetch,
  }
}
