import type { TUser, TUserCondominiumAccess, TUserRole, TPermission, TUserManagementCompanyAccess, TActiveRoleType } from '@packages/domain'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  fetchUserByFirebaseUid,
  syncUserFirebaseUid,
  FetchUserError,
  fetchUserCondominiums,
  fetchSuperadminSession,
  fetchUserManagementCompanies,
} from '@packages/http-client'

import { verifySessionToken } from '@/libs/firebase/server'
import {
  getUserCookieServer,
  getCondominiumsCookieServer,
  getSelectedCondominiumCookieServer,
  getManagementCompaniesCookieServer,
  getActiveRoleCookieServer,
} from '@/libs/cookies/server'

const SESSION_COOKIE_NAME = '__session'
const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 500

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff (silent retry)
 * Returns the result on success, or throws on final failure
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  description: string,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Only retry for retryable errors (429, 5xx)
      if (error instanceof FetchUserError && !error.isRetryable) {
        throw error
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`[getFullSession] ${description} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(delay)
      }
    }
  }

  // All retries failed
  console.error(`[getFullSession] ${description} failed after ${maxRetries} attempts:`, lastError)
  throw lastError
}

export interface FullSession {
  user: TUser
  condominiums: TUserCondominiumAccess[]
  selectedCondominium: TUserCondominiumAccess | null
  superadmin: TUserRole | null
  superadminPermissions: TPermission[]
  managementCompanies: TUserManagementCompanyAccess[]
  activeRole: TActiveRoleType | null
  sessionToken: string
  needsCondominiumSelection: boolean
  needsRoleSelection: boolean
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
 *
 * Note: Temporary errors (429, 5xx) are retried silently with exponential backoff.
 *
 * This function is wrapped with React's cache() to deduplicate calls within
 * the same request. Multiple components calling getFullSession() will share
 * the same result, preventing duplicate API calls and rate limiting issues.
 */
export const getFullSession = cache(async function getFullSession(): Promise<FullSession> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    redirect('/auth')
  }

  const decodedToken = await verifySessionToken(sessionToken)

  if (!decodedToken) {
    redirect('/auth?expired=true')
  }

  // Try to get user and condominium data from cookies first
  // Note: We always fetch superadmin status from API to catch permission changes
  const [cookieUser, cookieCondominiums, cookieSelectedCondominium, cookieManagementCompanies, cookieActiveRole] = await Promise.all([
    getUserCookieServer(),
    getCondominiumsCookieServer(),
    getSelectedCondominiumCookieServer(),
    getManagementCompaniesCookieServer(),
    getActiveRoleCookieServer(),
  ])

  // Validate that cached user matches current session
  const validCachedUser =
    cookieUser && cookieUser.firebaseUid === decodedToken.uid ? cookieUser : null

  // Determine what needs to be fetched
  const needsUserFetch = !validCachedUser || cookieCondominiums === null

  let user: TUser
  let condominiums: TUserCondominiumAccess[]
  let managementCompanies: TUserManagementCompanyAccess[]
  let superadmin: TUserRole | null = null
  let superadminPermissions: TPermission[] = []

  if (needsUserFetch) {
    // Fetch user from API by Firebase UID with silent retry
    let fetchedUser: TUser | null = null

    try {
      fetchedUser = await retryWithBackoff(
        () => fetchUserByFirebaseUid(decodedToken.uid, sessionToken),
        'fetchUserByFirebaseUid'
      )
    } catch (error) {
      // If all retries failed with retryable errors, redirect to signin with temporary error
      if (error instanceof FetchUserError && error.isRetryable) {
        redirect('/auth?error=temporary')
      }
      // For non-retryable errors (like 404), continue to try sync by email
    }

    // If user not found by Firebase UID, try to sync by email
    // This handles cases where the user exists with a different Firebase UID
    // (e.g., testing across different environments or Firebase projects)
    if (!fetchedUser && decodedToken.email) {
      try {
        fetchedUser = await retryWithBackoff(
          () => syncUserFirebaseUid(decodedToken.email!, decodedToken.uid, sessionToken),
          'syncUserFirebaseUid'
        )
      } catch (error) {
        // If all retries failed with retryable errors, redirect to signin with temporary error
        if (error instanceof FetchUserError && error.isRetryable) {
          redirect('/auth?error=temporary')
        }
        // For other errors, continue (fetchedUser will be null)
      }
    }

    if (!fetchedUser) {
      // User has valid Firebase session but doesn't exist in our database
      // This can happen if: user was deleted, registration was incomplete, or sync failed
      // Redirect to signin with a flag to clear the invalid session
      redirect('/auth?notfound=true')
    }

    user = fetchedUser

    // Fetch condominiums, superadmin, and management companies in parallel (with silent retry)
    const [condominiumsResponse, superadminSession, managementCompaniesResponse] = await Promise.all([
      retryWithBackoff(
        () => fetchUserCondominiums(sessionToken),
        'fetchUserCondominiums'
      ).catch(() => null), // Non-critical - fall back to empty
      retryWithBackoff(
        () => fetchSuperadminSession(fetchedUser.id, sessionToken),
        'fetchSuperadminSession'
      ).catch(() => null), // Non-critical - fall back to null
      retryWithBackoff(
        () => fetchUserManagementCompanies(sessionToken),
        'fetchUserManagementCompanies'
      ).catch(() => null), // Non-critical - fall back to empty
    ])

    condominiums = condominiumsResponse?.condominiums ?? []
    superadmin = superadminSession?.superadmin ?? null
    superadminPermissions = superadminSession?.permissions ?? []
    managementCompanies = managementCompaniesResponse?.managementCompanies ?? []

    // Note: We don't set cookies here because Server Components cannot set cookies.
    // The client-side StoreHydration component will update cookies when wasFetched=true.
  } else {
    user = validCachedUser!
    condominiums = cookieCondominiums ?? []
    managementCompanies = cookieManagementCompanies ?? []

    // Always verify superadmin status from API to catch permission changes
    // This ensures users get updated permissions even if they have valid cached user data
    // Use silent retry for resilience
    const superadminSession = await retryWithBackoff(
      () => fetchSuperadminSession(user.id, sessionToken),
      'fetchSuperadminSession'
    ).catch(() => null) // Non-critical - fall back to cached or null

    superadmin = superadminSession?.superadmin ?? null
    superadminPermissions = superadminSession?.permissions ?? []
  }

  const selectedCondominium =
    cookieSelectedCondominium ?? (condominiums.length === 1 ? condominiums[0] : null)

  // Compute available role types
  const availableRoles: TActiveRoleType[] = []
  if (superadmin) availableRoles.push('superadmin')
  if (managementCompanies.length > 0) availableRoles.push('management_company')
  if (condominiums.length > 0) availableRoles.push('condominium')

  // Determine active role: cookie → auto-select if single role → null
  let activeRole: TActiveRoleType | null = cookieActiveRole
  if (activeRole && !availableRoles.includes(activeRole)) {
    activeRole = null // Cookie role no longer valid
  }
  if (!activeRole && availableRoles.length === 1) {
    activeRole = availableRoles[0] // Auto-select when only one role type
  }

  const needsRoleSelection = availableRoles.length > 1 && !activeRole
  const needsCondominiumSelection =
    activeRole === 'condominium' && condominiums.length > 1 && !selectedCondominium

  return {
    user,
    condominiums,
    selectedCondominium,
    superadmin,
    superadminPermissions,
    managementCompanies,
    activeRole,
    sessionToken,
    needsCondominiumSelection,
    needsRoleSelection,
    wasFetched: needsUserFetch,
  }
})
