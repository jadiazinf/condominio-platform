import type { TUserCondominiumsResponse } from '@packages/domain'

import { useApiQuery } from './use-api-query'

export interface UseUserCondominiumsOptions {
  token?: string | null
  enabled?: boolean
}

/**
 * Hook to get all condominiums the current authenticated user has access to.
 * Requires a valid Firebase token to authenticate the request.
 * Returns condominiums where the user owns/rents units or has roles assigned.
 */
export function useUserCondominiums(options: UseUserCondominiumsOptions = {}) {
  const { token, enabled = true } = options

  return useApiQuery<TUserCondominiumsResponse>({
    path: '/platform/users/me/condominiums',
    queryKey: ['users', 'me', 'condominiums'],
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
