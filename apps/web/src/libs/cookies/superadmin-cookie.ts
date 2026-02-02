import type { TUserRole, TPermission } from '@packages/domain'

const SUPERADMIN_COOKIE_NAME = '__superadmin'
const SUPERADMIN_PERMISSIONS_COOKIE_NAME = '__superadmin_permissions'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecureFlag(): string {
  if (typeof window === 'undefined') return ''

  return window.location.protocol === 'https:' ? '; Secure' : ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Superadmin Cookie (Client-side)
// Now stores TUserRole instead of TSuperadminUser (which was removed)
// ─────────────────────────────────────────────────────────────────────────────

export function setSuperadminCookie(superadmin: TUserRole): void {
  const superadminJson = JSON.stringify(superadmin)
  const encodedSuperadmin = encodeURIComponent(superadminJson)

  document.cookie = `${SUPERADMIN_COOKIE_NAME}=${encodedSuperadmin}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${getSecureFlag()}`
}

export function getSuperadminCookie(): TUserRole | null {
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

    return JSON.parse(decodedValue) as TUserRole
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
// Note: Permissions are now always fetched from API, so we don't store the full
// permission objects in cookies (they exceed the 4KB cookie limit).
// We only store a lightweight version for hydration hints.
// ─────────────────────────────────────────────────────────────────────────────

export function setSuperadminPermissionsCookie(permissions: TPermission[]): void {
  // Don't store full permissions in cookies - they're too large (34 permissions > 4KB)
  // Permissions are always fetched fresh from API now
  // Just store a flag indicating the user has permissions
  if (permissions.length > 0) {
    document.cookie = `${SUPERADMIN_PERMISSIONS_COOKIE_NAME}=has_permissions; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${getSecureFlag()}`
  } else {
    clearSuperadminPermissionsCookie()
  }
}

export function getSuperadminPermissionsCookie(): TPermission[] | null {
  // Permissions are no longer stored in cookies (too large)
  // They are always fetched fresh from API
  // Clean up any old large permission cookies that might exist
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';')
    const permissionsCookie = cookies.find(cookie =>
      cookie.trim().startsWith(`${SUPERADMIN_PERMISSIONS_COOKIE_NAME}=`)
    )

    // If there's an old cookie with actual permission data, clear it
    if (permissionsCookie && !permissionsCookie.includes('has_permissions')) {
      clearSuperadminPermissionsCookie()
    }
  }

  return null
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
