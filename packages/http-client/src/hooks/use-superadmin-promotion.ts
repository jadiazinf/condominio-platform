import { getHttpClient } from '../client/http-client'
import type { TApiMessageResponse } from '../types/api-responses'

// =============================================================================
// Types
// =============================================================================

export interface IPromoteToSuperadminPayload {
  permissionIds: string[]
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Promotes a user to superadmin by assigning them superadmin permissions.
 * The user will get the SUPERADMIN role with the specified permissions.
 *
 * @param token - Auth token
 * @param userId - User ID to promote
 * @param permissionIds - Array of permission IDs to grant
 * @returns Success message
 */
export async function promoteUserToSuperadmin(
  token: string,
  userId: string,
  permissionIds: string[]
): Promise<TApiMessageResponse> {
  const client = getHttpClient()

  const payload: IPromoteToSuperadminPayload = {
    permissionIds,
  }

  const response = await client.post<TApiMessageResponse>(
    `/users/${userId}/promote-to-superadmin`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data
}

/**
 * Demotes a superadmin user back to regular user.
 * This removes the SUPERADMIN role and all associated permissions.
 *
 * @param token - Auth token
 * @param userId - User ID to demote
 * @returns Success message
 */
export async function demoteUserFromSuperadmin(
  token: string,
  userId: string
): Promise<TApiMessageResponse> {
  const client = getHttpClient()

  const response = await client.post<TApiMessageResponse>(
    `/users/${userId}/demote-from-superadmin`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data
}
