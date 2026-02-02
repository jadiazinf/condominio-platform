import type { TUserRole, TPermission, TUser } from '@packages/domain'

import { getEnvConfig } from '../config/env'
import type { TApiDataResponse } from '../types/api-responses'

export interface TSuperadminSession {
  superadmin: TUserRole
  permissions: TPermission[]
}

/**
 * Checks if a user is a superadmin.
 * Returns true if the user has an active SUPERADMIN role with global scope.
 */
export async function checkIsSuperadmin(
  userId: string,
  token: string
): Promise<boolean> {
  try {
    const { apiBaseUrl } = getEnvConfig()
    const response = await fetch(`${apiBaseUrl}/user-roles/superadmin/check/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return false
    }

    const data = (await response.json()) as TApiDataResponse<{ isSuperadmin: boolean }>
    return data.data?.isSuperadmin ?? false
  } catch (error) {
    console.error('Error checking superadmin status:', error)
    return false
  }
}

/**
 * Fetches the complete superadmin session data (role + permissions).
 * Returns null if the user is not a superadmin or is inactive.
 *
 * This is the main function to use for getting superadmin session data.
 */
export async function fetchSuperadminSession(
  userId: string,
  token: string
): Promise<TSuperadminSession | null> {
  try {
    const { apiBaseUrl } = getEnvConfig()
    const response = await fetch(`${apiBaseUrl}/user-roles/superadmin/session/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch superadmin session: ${response.status}`)
    }

    const data = (await response.json()) as TApiDataResponse<TSuperadminSession | null>
    return data.data
  } catch (error) {
    console.error('Error fetching superadmin session:', error)
    return null
  }
}

/**
 * Fetches all active superadmin users (TUser objects).
 * Useful for assignment dropdowns.
 */
export async function fetchActiveSuperadminUsers(
  token: string
): Promise<TUser[]> {
  try {
    const { apiBaseUrl } = getEnvConfig()

    const response = await fetch(`${apiBaseUrl}/user-roles/superadmin/active-users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch active superadmin users: ${response.status}`)
    }

    const data = (await response.json()) as TApiDataResponse<TUser[]>
    return data.data ?? []
  } catch (error) {
    console.error('Error fetching active superadmin users:', error)
    return []
  }
}

// =============================================================================
// DEPRECATED FUNCTIONS - Kept for backwards compatibility
// =============================================================================

/**
 * @deprecated Use fetchSuperadminSession instead.
 * Fetches superadmin user data by user ID.
 */
export async function fetchSuperadminByUserId(
  userId: string,
  token: string
): Promise<TUserRole | null> {
  const session = await fetchSuperadminSession(userId, token)
  return session?.superadmin ?? null
}

/**
 * @deprecated Permissions are now included in fetchSuperadminSession.
 * Fetches permissions for a superadmin (now fetches role permissions).
 */
export async function fetchSuperadminPermissions(
  _superadminId: string,
  token: string
): Promise<TPermission[]> {
  // Note: This function signature is kept for compatibility but now
  // returns the permissions from the SUPERADMIN role.
  // The superadminId parameter is ignored since permissions come from the role.
  try {
    const { apiBaseUrl } = getEnvConfig()
    // We need to get permissions from any superadmin session
    // This is a fallback - prefer using fetchSuperadminSession directly
    const response = await fetch(`${apiBaseUrl}/user-roles/superadmin/active-users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as TApiDataResponse<TUser[]>
    const firstUser = data.data?.[0]
    if (!firstUser) return []

    // Fetch the session to get permissions
    const session = await fetchSuperadminSession(firstUser.id, token)
    return session?.permissions ?? []
  } catch (error) {
    console.error('Error fetching superadmin permissions:', error)
    return []
  }
}
