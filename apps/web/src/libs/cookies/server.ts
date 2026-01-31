import type { TUser, TUserCondominiumAccess, TSuperadminUser, TPermission } from '@packages/domain'

import { cookies } from 'next/headers'

const USER_COOKIE_NAME = '__user'
const CONDOMINIUMS_COOKIE_NAME = '__condominiums'
const SELECTED_CONDOMINIUM_COOKIE_NAME = '__selected_condominium'
const SUPERADMIN_COOKIE_NAME = '__superadmin'
const SUPERADMIN_PERMISSIONS_COOKIE_NAME = '__superadmin_permissions'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// ─────────────────────────────────────────────────────────────────────────────
// User Cookie (Server-side)
// ─────────────────────────────────────────────────────────────────────────────

export async function setUserCookieServer(user: TUser): Promise<void> {
  const cookieStore = await cookies()
  const userJson = JSON.stringify(user)
  const encodedUser = encodeURIComponent(userJson)

  cookieStore.set(USER_COOKIE_NAME, encodedUser, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function getUserCookieServer(): Promise<TUser | null> {
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

// ─────────────────────────────────────────────────────────────────────────────
// Condominiums Cookie (Server-side)
// ─────────────────────────────────────────────────────────────────────────────

export async function setCondominiumsCookieServer(
  condominiums: TUserCondominiumAccess[]
): Promise<void> {
  const cookieStore = await cookies()
  const condominiumsJson = JSON.stringify(condominiums)
  const encodedCondominiums = encodeURIComponent(condominiumsJson)

  cookieStore.set(CONDOMINIUMS_COOKIE_NAME, encodedCondominiums, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function getCondominiumsCookieServer(): Promise<TUserCondominiumAccess[] | null> {
  const cookieStore = await cookies()
  const condominiumsCookie = cookieStore.get(CONDOMINIUMS_COOKIE_NAME)

  if (!condominiumsCookie?.value) {
    return null
  }

  try {
    const decodedValue = decodeURIComponent(condominiumsCookie.value)

    return JSON.parse(decodedValue) as TUserCondominiumAccess[]
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Selected Condominium Cookie (Server-side)
// ─────────────────────────────────────────────────────────────────────────────

export async function setSelectedCondominiumCookieServer(
  condominium: TUserCondominiumAccess
): Promise<void> {
  const cookieStore = await cookies()
  const condominiumJson = JSON.stringify(condominium)
  const encodedCondominium = encodeURIComponent(condominiumJson)

  cookieStore.set(SELECTED_CONDOMINIUM_COOKIE_NAME, encodedCondominium, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function getSelectedCondominiumCookieServer(): Promise<TUserCondominiumAccess | null> {
  const cookieStore = await cookies()
  const selectedCookie = cookieStore.get(SELECTED_CONDOMINIUM_COOKIE_NAME)

  if (!selectedCookie?.value) {
    return null
  }

  try {
    const decodedValue = decodeURIComponent(selectedCookie.value)

    return JSON.parse(decodedValue) as TUserCondominiumAccess
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Superadmin Cookie (Server-side)
// ─────────────────────────────────────────────────────────────────────────────

export async function setSuperadminCookieServer(superadmin: TSuperadminUser): Promise<void> {
  const cookieStore = await cookies()
  const superadminJson = JSON.stringify(superadmin)
  const encodedSuperadmin = encodeURIComponent(superadminJson)

  cookieStore.set(SUPERADMIN_COOKIE_NAME, encodedSuperadmin, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function getSuperadminCookieServer(): Promise<TSuperadminUser | null> {
  const cookieStore = await cookies()
  const superadminCookie = cookieStore.get(SUPERADMIN_COOKIE_NAME)

  if (!superadminCookie?.value) {
    return null
  }

  try {
    const decodedValue = decodeURIComponent(superadminCookie.value)

    return JSON.parse(decodedValue) as TSuperadminUser
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Superadmin Permissions Cookie (Server-side)
// Note: Permissions are now always fetched from API, so we don't store the full
// permission objects in cookies (they exceed the 4KB cookie limit).
// ─────────────────────────────────────────────────────────────────────────────

export async function setSuperadminPermissionsCookieServer(
  _permissions: TPermission[]
): Promise<void> {
  // Don't store full permissions in cookies - they're too large (34 permissions > 4KB)
  // Permissions are always fetched fresh from API now
}

export async function getSuperadminPermissionsCookieServer(): Promise<TPermission[] | null> {
  // Permissions are no longer stored in cookies (too large)
  // They are always fetched fresh from API
  return null
}
