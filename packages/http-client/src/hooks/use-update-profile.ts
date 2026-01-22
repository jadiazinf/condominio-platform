import type { TUser, TUserUpdateProfile } from '@packages/domain'

import { useApiMutation } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { ApiResponse } from '../types/http'
import { HttpError } from '../types/http'
import type { TApiDataMessageResponse } from '../types/api-responses'

export interface UseUpdateProfileOptions {
  token: string
  onSuccess?: (data: ApiResponse<TApiDataMessageResponse<TUser>>) => void
  onError?: (error: HttpError) => void
}

/**
 * Hook to update the current user's profile.
 * Only allows modifying profile-safe fields (displayName, firstName, lastName, etc.).
 * Sensitive fields like email, firebaseUid, isActive are excluded from updates.
 */
export function useUpdateProfile(options: UseUpdateProfileOptions) {
  const { token, onSuccess, onError } = options

  return useApiMutation<TApiDataMessageResponse<TUser>, TUserUpdateProfile>({
    path: '/users/me',
    method: 'PATCH',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    invalidateKeys: [['users', 'me']],
    onSuccess,
    onError,
  })
}

/**
 * Function to update the current user's profile.
 * Use this for imperative updates where you need dynamic token handling.
 */
export async function updateProfile(
  token: string,
  data: TUserUpdateProfile
): Promise<TUser> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataMessageResponse<TUser>>('/users/me', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}
