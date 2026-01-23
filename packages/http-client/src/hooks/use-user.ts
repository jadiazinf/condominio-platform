import type { TUser } from '@packages/domain'

import { useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'

export interface UseCurrentUserOptions {
  token?: string | null
  enabled?: boolean
}

/**
 * Hook to get the current authenticated user.
 * Requires a valid Firebase token to authenticate the request.
 * The backend extracts the firebaseUid from the token and returns the user.
 */
export function useCurrentUser(options: UseCurrentUserOptions = {}) {
  const { token, enabled = true } = options

  return useApiQuery<TUser>({
    path: '/users/me',
    queryKey: ['users', 'me'],
    enabled: enabled && !!token,
    config: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  })
}

export interface UseUserByFirebaseUidOptions {
  token?: string | null
  enabled?: boolean
}

/**
 * @deprecated Use useCurrentUser instead. This hook exposes the firebaseUid in the URL.
 */
export function useUserByFirebaseUid(
  firebaseUid: string | undefined,
  options: UseUserByFirebaseUidOptions = {}
) {
  const { token, enabled = true } = options

  return useApiQuery<TUser>({
    path: `/users/firebase/${firebaseUid}`,
    queryKey: ['users', 'firebase', firebaseUid],
    enabled: enabled && !!firebaseUid && !!token,
    config: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  })
}

/**
 * Function to fetch a user by email.
 */
export async function getUserByEmail(token: string, email: string): Promise<TUser> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TUser>>(`/users/email/${email}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}
