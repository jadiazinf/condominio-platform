import type { DecodedIdToken } from 'firebase-admin/auth'
import type { TUser } from '@packages/domain'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { fetchUserByFirebaseUid } from '@packages/http-client'

import { getAdminAuth } from './admin'

const SESSION_COOKIE_NAME = '__session'
const USER_COOKIE_NAME = '__user'

export interface AuthenticatedSession {
  decodedToken: DecodedIdToken
  sessionToken: string
  user: TUser | null
}

export async function verifySessionToken(token: string): Promise<DecodedIdToken | null> {
  try {
    const adminAuth = getAdminAuth()
    const decodedToken = await adminAuth.verifyIdToken(token)

    return decodedToken
  } catch {
    return null
  }
}

export async function getSessionFromCookies(): Promise<DecodedIdToken | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  return verifySessionToken(sessionCookie.value)
}

async function getUserFromCookies(): Promise<TUser | null> {
  const cookieStore = await cookies()
  const userCookie = cookieStore.get(USER_COOKIE_NAME)

  if (!userCookie?.value) {
    return null
  }

  try {
    const decodedValue = decodeURIComponent(userCookie.value)

    return JSON.parse(decodedValue) as TUser
  } catch {
    return null
  }
}

/**
 * Gets the authenticated session with user data.
 * First tries to get user from cookies, then falls back to API fetch.
 * If no valid session exists, redirects to sign in page.
 * Use this in protected pages/routes.
 */
export async function getAuthenticatedSession(): Promise<AuthenticatedSession> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    redirect('/auth')
  }

  const decodedToken = await verifySessionToken(sessionToken)

  if (!decodedToken) {
    // Token is invalid/expired - redirect with flag to clear cookies on client
    redirect('/auth?expired=true')
  }

  // Try to get user from cookies first (faster, no API call)
  let user = await getUserFromCookies()

  // Validate that cached user matches the current session
  if (user && user.firebaseUid !== decodedToken.uid) {
    user = null
  }

  // Fallback to API fetch if user not in cookies
  if (!user) {
    user = await fetchUserByFirebaseUid(decodedToken.uid, sessionToken)
  }

  return {
    decodedToken,
    sessionToken,
    user,
  }
}

/**
 * Gets the session without redirecting.
 * First tries to get user from cookies, then falls back to API fetch.
 * Returns null if no valid session exists.
 * Use this when you need to check auth state without forcing a redirect.
 */
export async function getOptionalSession(): Promise<AuthenticatedSession | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    return null
  }

  const decodedToken = await verifySessionToken(sessionToken)

  if (!decodedToken) {
    return null
  }

  // Try to get user from cookies first (faster, no API call)
  let user = await getUserFromCookies()

  // Validate that cached user matches the current session
  if (user && user.firebaseUid !== decodedToken.uid) {
    user = null
  }

  // Fallback to API fetch if user not in cookies
  if (!user) {
    user = await fetchUserByFirebaseUid(decodedToken.uid, sessionToken)
  }

  return {
    decodedToken,
    sessionToken,
    user,
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME
}
