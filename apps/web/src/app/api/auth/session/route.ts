import type { TUserCondominiumAccess, TActiveRoleType } from '@packages/domain'

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  fetchUserByFirebaseUid,
  fetchUserCondominiums,
  fetchSuperadminSession,
  fetchUserManagementCompanies,
} from '@packages/http-client'

import { verifySessionToken } from '@/libs/firebase/server'

const USER_COOKIE_NAME = '__user'
const CONDOMINIUMS_COOKIE_NAME = '__condominiums'
const SELECTED_CONDOMINIUM_COOKIE_NAME = '__selected_condominium'
const SUPERADMIN_COOKIE_NAME = '__superadmin'
const SUPERADMIN_PERMISSIONS_COOKIE_NAME = '__superadmin_permissions'
const MANAGEMENT_COMPANIES_COOKIE_NAME = '__management_companies'
const ACTIVE_ROLE_COOKIE_NAME = '__active_role'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

interface SessionResponse {
  redirectTo: string
}

export async function GET(request: NextRequest): Promise<NextResponse<SessionResponse>> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('__session')?.value

  if (!sessionToken) {
    return NextResponse.json({ redirectTo: '/auth' })
  }

  // Validate token
  const decodedToken = await verifySessionToken(sessionToken)

  if (!decodedToken) {
    return NextResponse.json({ redirectTo: '/auth?expired=true' })
  }

  // Fetch user first
  const user = await fetchUserByFirebaseUid(decodedToken.uid, sessionToken)

  if (!user) {
    return NextResponse.json({ redirectTo: '/signup' })
  }

  // Fetch condominiums, superadmin, and management companies in parallel
  const [condominiumsResponse, superadminSession, managementCompaniesResponse] = await Promise.all([
    fetchUserCondominiums(sessionToken),
    fetchSuperadminSession(user.id, sessionToken),
    fetchUserManagementCompanies(sessionToken).catch(() => null),
  ])

  if (!condominiumsResponse) {
    return NextResponse.json({ redirectTo: '/auth' })
  }

  const condominiums = condominiumsResponse.condominiums
  const managementCompanies = managementCompaniesResponse?.managementCompanies ?? []
  const isSuperadmin = !!superadminSession
  const isSecure = process.env.NODE_ENV === 'production'

  // Compute available roles and determine active role
  const availableRoles: TActiveRoleType[] = []
  if (isSuperadmin) availableRoles.push('superadmin')
  if (managementCompanies.length > 0) availableRoles.push('management_company')
  if (condominiums.length > 0) availableRoles.push('condominium')

  // Read existing active role cookie
  const cookieStore2 = await cookies()
  const existingActiveRole = cookieStore2.get(ACTIVE_ROLE_COOKIE_NAME)?.value as
    | TActiveRoleType
    | undefined
  let activeRole: TActiveRoleType | null =
    existingActiveRole && availableRoles.includes(existingActiveRole) ? existingActiveRole : null

  // Auto-select if only one role type
  if (!activeRole && availableRoles.length === 1) {
    activeRole = availableRoles[0]
  }

  // Determine redirect path
  const needsRoleSelection = availableRoles.length > 1 && !activeRole
  const redirectTo = getRedirectPath(condominiums, needsRoleSelection, activeRole)
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

  // Set management companies cookie
  if (managementCompanies.length > 0) {
    response.cookies.set(
      MANAGEMENT_COMPANIES_COOKIE_NAME,
      encodeURIComponent(JSON.stringify(managementCompanies)),
      {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure: isSecure,
      }
    )
  }

  // Set active role cookie if determined
  if (activeRole) {
    response.cookies.set(ACTIVE_ROLE_COOKIE_NAME, activeRole, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: isSecure,
    })
  }

  return response
}

function getRedirectPath(
  condominiums: TUserCondominiumAccess[],
  needsRoleSelection: boolean,
  activeRole: TActiveRoleType | null
): string {
  if (needsRoleSelection) {
    return '/select-role'
  }

  if (activeRole === 'condominium' && condominiums.length > 1) {
    return '/select-condominium'
  }

  return '/dashboard'
}
