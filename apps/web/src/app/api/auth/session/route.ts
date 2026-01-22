import type { TUserCondominiumAccess } from '@packages/domain'

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  fetchUserByFirebaseUid,
  fetchUserCondominiums,
  fetchSuperadminSession,
} from '@packages/http-client'

import { verifySessionToken } from '@/libs/firebase/server'

const USER_COOKIE_NAME = '__user'
const CONDOMINIUMS_COOKIE_NAME = '__condominiums'
const SELECTED_CONDOMINIUM_COOKIE_NAME = '__selected_condominium'
const SUPERADMIN_COOKIE_NAME = '__superadmin'
const SUPERADMIN_PERMISSIONS_COOKIE_NAME = '__superadmin_permissions'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

interface SessionResponse {
  redirectTo: string
}

export async function GET(request: NextRequest): Promise<NextResponse<SessionResponse>> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('__session')?.value

  if (!sessionToken) {
    return NextResponse.json({ redirectTo: '/signin' })
  }

  // Validate token
  const decodedToken = await verifySessionToken(sessionToken)

  if (!decodedToken) {
    return NextResponse.json({ redirectTo: '/signin?expired=true' })
  }

  // Fetch user first
  const user = await fetchUserByFirebaseUid(decodedToken.uid, sessionToken)

  if (!user) {
    return NextResponse.json({ redirectTo: '/signup' })
  }

  // Fetch condominiums and superadmin status in parallel
  const [condominiumsResponse, superadminSession] = await Promise.all([
    fetchUserCondominiums(sessionToken),
    fetchSuperadminSession(user.id, sessionToken),
  ])

  if (!condominiumsResponse) {
    return NextResponse.json({ redirectTo: '/signin' })
  }

  const condominiums = condominiumsResponse.condominiums
  const isSecure = process.env.NODE_ENV === 'production'

  // Determine redirect path
  const redirectTo = getRedirectPath(condominiums)
  const response = NextResponse.json({ redirectTo })

  // Set user cookie
  response.cookies.set(USER_COOKIE_NAME, encodeURIComponent(JSON.stringify(user)), {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: isSecure,
  })

  // Set condominiums cookie
  response.cookies.set(CONDOMINIUMS_COOKIE_NAME, encodeURIComponent(JSON.stringify(condominiums)), {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: isSecure,
  })

  // Set selected condominium if only one
  if (condominiums.length === 1) {
    response.cookies.set(
      SELECTED_CONDOMINIUM_COOKIE_NAME,
      encodeURIComponent(JSON.stringify(condominiums[0])),
      {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure: isSecure,
      }
    )
  }

  // Set superadmin cookies if user is a superadmin
  if (superadminSession) {
    response.cookies.set(
      SUPERADMIN_COOKIE_NAME,
      encodeURIComponent(JSON.stringify(superadminSession.superadmin)),
      {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure: isSecure,
      }
    )

    response.cookies.set(
      SUPERADMIN_PERMISSIONS_COOKIE_NAME,
      encodeURIComponent(JSON.stringify(superadminSession.permissions)),
      {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure: isSecure,
      }
    )
  }

  return response
}

function getRedirectPath(condominiums: TUserCondominiumAccess[]): string {
  // All users go to /dashboard - the layout will show appropriate shell based on user type
  if (condominiums.length > 1) {
    return '/select-condominium'
  }

  return '/dashboard'
}
