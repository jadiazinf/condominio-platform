import type { TUserManagementCompanyAccess, TActiveRoleType } from '@packages/domain'

const MANAGEMENT_COMPANIES_COOKIE_NAME = '__management_companies'
const ACTIVE_ROLE_COOKIE_NAME = '__active_role'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecureFlag(): string {
  if (typeof window === 'undefined') return ''

  return window.location.protocol === 'https:' ? '; Secure' : ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Management Companies Cookie (Client-side)
// ─────────────────────────────────────────────────────────────────────────────

export function setManagementCompaniesCookie(companies: TUserManagementCompanyAccess[]): void {
  const json = JSON.stringify(companies)
  const encoded = encodeURIComponent(json)

  document.cookie = `${MANAGEMENT_COMPANIES_COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${getSecureFlag()}`
}

export function getManagementCompaniesCookie(): TUserManagementCompanyAccess[] | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  const cookie = cookies.find(c => c.trim().startsWith(`${MANAGEMENT_COMPANIES_COOKIE_NAME}=`))

  if (!cookie) {
    return null
  }

  try {
    const encodedValue = cookie.split('=').slice(1).join('=')
    const decodedValue = decodeURIComponent(encodedValue)

    return JSON.parse(decodedValue) as TUserManagementCompanyAccess[]
  } catch {
    return null
  }
}

export function clearManagementCompaniesCookie(): void {
  document.cookie = `${MANAGEMENT_COMPANIES_COOKIE_NAME}=; path=/; max-age=0${getSecureFlag()}`
}

export function getManagementCompaniesCookieName(): string {
  return MANAGEMENT_COMPANIES_COOKIE_NAME
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Role Cookie (Client-side)
// ─────────────────────────────────────────────────────────────────────────────

export function setActiveRoleCookie(role: TActiveRoleType): void {
  document.cookie = `${ACTIVE_ROLE_COOKIE_NAME}=${role}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${getSecureFlag()}`
}

export function getActiveRoleCookie(): TActiveRoleType | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  const cookie = cookies.find(c => c.trim().startsWith(`${ACTIVE_ROLE_COOKIE_NAME}=`))

  if (!cookie) {
    return null
  }

  const value = cookie.split('=')[1]?.trim()
  if (value === 'superadmin' || value === 'management_company' || value === 'condominium') {
    return value
  }

  return null
}

export function clearActiveRoleCookie(): void {
  document.cookie = `${ACTIVE_ROLE_COOKIE_NAME}=; path=/; max-age=0${getSecureFlag()}`
}

export function getActiveRoleCookieName(): string {
  return ACTIVE_ROLE_COOKIE_NAME
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

export function clearAllManagementCompanyCookies(): void {
  clearManagementCompaniesCookie()
  clearActiveRoleCookie()
}
