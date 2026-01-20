import type { TUser, TUserCondominiumAccess } from '@packages/domain'

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { fetchUserByFirebaseUid, fetchUserCondominiums } from '@packages/http-client'

import { verifySessionToken } from '@/libs/firebase/server'

const USER_COOKIE_NAME = '__user'
const CONDOMINIUMS_COOKIE_NAME = '__condominiums'
const SELECTED_CONDOMINIUM_COOKIE_NAME = '__selected_condominium'
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

  // Fetch user and condominiums in parallel
  const [user, condominiumsResponse] = await Promise.all([
    fetchUserByFirebaseUid(decodedToken.uid, sessionToken),
    fetchUserCondominiums(sessionToken),
  ])

  if (!user) {
    return NextResponse.json({ redirectTo: '/signup' })
  }

  if (!condominiumsResponse) {
    return NextResponse.json({ redirectTo: '/signin' })
  }

  const condominiums = condominiumsResponse.condominiums
  const isSecure = process.env.NODE_ENV === 'production'

  // Set user cookie
  const response = NextResponse.json({ redirectTo: getRedirectPath(condominiums) })

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

  return response
}

function getRedirectPath(condominiums: TUserCondominiumAccess[]): string {
  if (condominiums.length === 0) {
    return '/dashboard'
  }

  if (condominiums.length === 1) {
    return '/dashboard'
  }

  return '/select-condominium'
}
