import type { TUserCondominiumAccess } from '@packages/domain'

const CONDOMINIUMS_COOKIE_NAME = '__condominiums'
const SELECTED_CONDOMINIUM_COOKIE_NAME = '__selected_condominium'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecureFlag(): string {
  if (typeof window === 'undefined') return ''

  return window.location.protocol === 'https:' ? '; Secure' : ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Condominiums List Cookie (all condominiums the user has access to)
// ─────────────────────────────────────────────────────────────────────────────

export function setCondominiumsCookie(condominiums: TUserCondominiumAccess[]): void {
  const condominiumsJson = JSON.stringify(condominiums)
  const encodedCondominiums = encodeURIComponent(condominiumsJson)

  document.cookie = `${CONDOMINIUMS_COOKIE_NAME}=${encodedCondominiums}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${getSecureFlag()}`
}

export function getCondominiumsCookie(): TUserCondominiumAccess[] | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  const condominiumsCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`${CONDOMINIUMS_COOKIE_NAME}=`)
  )

  if (!condominiumsCookie) {
    return null
  }

  try {
    const encodedValue = condominiumsCookie.split('=')[1]
    const decodedValue = decodeURIComponent(encodedValue)

    return JSON.parse(decodedValue) as TUserCondominiumAccess[]
  } catch {
    return null
  }
}

export function clearCondominiumsCookie(): void {
  document.cookie = `${CONDOMINIUMS_COOKIE_NAME}=; path=/; max-age=0${getSecureFlag()}`
}

export function getCondominiumsCookieName(): string {
  return CONDOMINIUMS_COOKIE_NAME
}

// ─────────────────────────────────────────────────────────────────────────────
// Selected Condominium Cookie (the current active condominium for the session)
// ─────────────────────────────────────────────────────────────────────────────

export function setSelectedCondominiumCookie(condominium: TUserCondominiumAccess): void {
  const condominiumJson = JSON.stringify(condominium)
  const encodedCondominium = encodeURIComponent(condominiumJson)

  document.cookie = `${SELECTED_CONDOMINIUM_COOKIE_NAME}=${encodedCondominium}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${getSecureFlag()}`
}

export function getSelectedCondominiumCookie(): TUserCondominiumAccess | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  const selectedCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`${SELECTED_CONDOMINIUM_COOKIE_NAME}=`)
  )

  if (!selectedCookie) {
    return null
  }

  try {
    const encodedValue = selectedCookie.split('=')[1]
    const decodedValue = decodeURIComponent(encodedValue)

    return JSON.parse(decodedValue) as TUserCondominiumAccess
  } catch {
    return null
  }
}

export function clearSelectedCondominiumCookie(): void {
  document.cookie = `${SELECTED_CONDOMINIUM_COOKIE_NAME}=; path=/; max-age=0${getSecureFlag()}`
}

export function getSelectedCondominiumCookieName(): string {
  return SELECTED_CONDOMINIUM_COOKIE_NAME
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility to clear all condominium-related cookies
// ─────────────────────────────────────────────────────────────────────────────

export function clearAllCondominiumCookies(): void {
  clearCondominiumsCookie()
  clearSelectedCondominiumCookie()
}
