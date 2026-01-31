import type { TSuperadminUser, TPermission, TUser } from '@packages/domain'

import { getEnvConfig } from '../config/env'
import type { TApiDataResponse } from '../types/api-responses'

export interface TSuperadminSession {
  superadmin: TSuperadminUser
  permissions: TPermission[]
}

/**
 * Fetches superadmin user data by user ID.
 * Returns null if the user is not a superadmin.
 */
export async function fetchSuperadminByUserId(
  userId: string,
  token: string
): Promise<TSuperadminUser | null> {
  try {
    const { apiBaseUrl } = getEnvConfig()
    const response = await fetch(`${apiBaseUrl}/superadmin-users/user/${userId}`, {
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
      throw new Error(`Failed to fetch superadmin: ${response.status}`)
    }

    const data = (await response.json()) as TApiDataResponse<TSuperadminUser>
    return data.data
  } catch (error) {
    console.error('Error fetching superadmin by user ID:', error)
    return null
  }
}

/**
 * Fetches detailed permissions for a superadmin user.
 */
export async function fetchSuperadminPermissions(
  superadminId: string,
  token: string
): Promise<TPermission[]> {
  try {
    const { apiBaseUrl } = getEnvConfig()
    const response = await fetch(
      `${apiBaseUrl}/superadmin-user-permissions/superadmin/${superadminId}/detailed`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch superadmin permissions: ${response.status}`)
    }

    const data = (await response.json()) as TApiDataResponse<TPermission[]>
    return data.data
  } catch (error) {
    console.error('Error fetching superadmin permissions:', error)
    return []
  }
}

/**
 * Fetches the complete superadmin session data (superadmin + permissions).
 * Returns null if the user is not a superadmin or is inactive.
 */
export async function fetchSuperadminSession(
  userId: string,
  token: string
): Promise<TSuperadminSession | null> {
  const superadmin = await fetchSuperadminByUserId(userId, token)

  if (!superadmin || !superadmin.isActive) {
    return null
  }

  const permissions = await fetchSuperadminPermissions(superadmin.id, token)

  return {
    superadmin,
    permissions,
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

    const response = await fetch(`${apiBaseUrl}/superadmin-users/active-users`, {
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
