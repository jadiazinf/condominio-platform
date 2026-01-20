import type { TUser, TUserCondominiumAccess } from '@packages/domain'

import { cookies } from 'next/headers'

const USER_COOKIE_NAME = '__user'
const CONDOMINIUMS_COOKIE_NAME = '__condominiums'
const SELECTED_CONDOMINIUM_COOKIE_NAME = '__selected_condominium'
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

export async function setCondominiumsCookieServer(condominiums: TUserCondominiumAccess[]): Promise<void> {
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
