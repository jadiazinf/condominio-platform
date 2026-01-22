import type { TSuperadminUser, TPermission } from '@packages/domain'

const SUPERADMIN_COOKIE_NAME = '__superadmin'
const SUPERADMIN_PERMISSIONS_COOKIE_NAME = '__superadmin_permissions'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecureFlag(): string {
  if (typeof window === 'undefined') return ''

  return window.location.protocol === 'https:' ? '; Secure' : ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Superadmin Cookie (Client-side)
// ─────────────────────────────────────────────────────────────────────────────

export function setSuperadminCookie(superadmin: TSuperadminUser): void {
  const superadminJson = JSON.stringify(superadmin)
  const encodedSuperadmin = encodeURIComponent(superadminJson)

  document.cookie = `${SUPERADMIN_COOKIE_NAME}=${encodedSuperadmin}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${getSecureFlag()}`
}

export function getSuperadminCookie(): TSuperadminUser | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  const superadminCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`${SUPERADMIN_COOKIE_NAME}=`)
  )

  if (!superadminCookie) {
    return null
  }

  try {
    const encodedValue = superadminCookie.split('=')[1]
    const decodedValue = decodeURIComponent(encodedValue)

    return JSON.parse(decodedValue) as TSuperadminUser
  } catch {
    return null
  }
}

export function clearSuperadminCookie(): void {
  document.cookie = `${SUPERADMIN_COOKIE_NAME}=; path=/; max-age=0${getSecureFlag()}`
}

export function getSuperadminCookieName(): string {
  return SUPERADMIN_COOKIE_NAME
}

// ─────────────────────────────────────────────────────────────────────────────
// Superadmin Permissions Cookie (Client-side)
// ─────────────────────────────────────────────────────────────────────────────

export function setSuperadminPermissionsCookie(permissions: TPermission[]): void {
  const permissionsJson = JSON.stringify(permissions)
  const encodedPermissions = encodeURIComponent(permissionsJson)

  document.cookie = `${SUPERADMIN_PERMISSIONS_COOKIE_NAME}=${encodedPermissions}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${getSecureFlag()}`
}

export function getSuperadminPermissionsCookie(): TPermission[] | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  const permissionsCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`${SUPERADMIN_PERMISSIONS_COOKIE_NAME}=`)
  )

  if (!permissionsCookie) {
    return null
  }

  try {
    const encodedValue = permissionsCookie.split('=')[1]
    const decodedValue = decodeURIComponent(encodedValue)

    return JSON.parse(decodedValue) as TPermission[]
  } catch {
    return null
  }
}

export function clearSuperadminPermissionsCookie(): void {
  document.cookie = `${SUPERADMIN_PERMISSIONS_COOKIE_NAME}=; path=/; max-age=0${getSecureFlag()}`
}

export function getSuperadminPermissionsCookieName(): string {
  return SUPERADMIN_PERMISSIONS_COOKIE_NAME
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

export function clearAllSuperadminCookies(): void {
  clearSuperadminCookie()
  clearSuperadminPermissionsCookie()
}
