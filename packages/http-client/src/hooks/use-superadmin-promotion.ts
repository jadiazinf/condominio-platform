import { useApiMutation } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiMessageResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import { usersKeys } from './use-users'

// =============================================================================
// Types
// =============================================================================

export interface IPromoteToSuperadminPayload {
  permissionIds: string[]
}

export interface IPromoteToSuperadminVariables {
  userId: string
  permissionIds: string[]
}

export interface IDemoteFromSuperadminVariables {
  userId: string
}

export interface IUsePromoteToSuperadminOptions {
  onSuccess?: (data: ApiResponse<TApiMessageResponse>) => void
  onError?: (error: Error) => void
}

export interface IUseDemoteFromSuperadminOptions {
  onSuccess?: (data: ApiResponse<TApiMessageResponse>) => void
  onError?: (error: Error) => void
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

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to promote a user to superadmin.
 * This will assign the SUPERADMIN role and the specified permissions.
 */
export function usePromoteToSuperadmin(options?: IUsePromoteToSuperadminOptions) {
  return useApiMutation<TApiMessageResponse, IPromoteToSuperadminVariables>({
    path: (variables) => `/users/${variables.userId}/promote-to-superadmin`,
    method: 'POST',
    invalidateKeys: [usersKeys.all],
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

/**
 * Hook to demote a superadmin user back to regular user.
 * This will remove the SUPERADMIN role and all associated permissions.
 */
export function useDemoteFromSuperadmin(options?: IUseDemoteFromSuperadminOptions) {
  return useApiMutation<TApiMessageResponse, IDemoteFromSuperadminVariables>({
    path: (variables) => `/users/${variables.userId}/demote-from-superadmin`,
    method: 'POST',
    invalidateKeys: [usersKeys.all],
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}
