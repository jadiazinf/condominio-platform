import type { TApiMessageResponse } from '../types'
import { useApiMutation } from './use-api-query'
import { condominiumsKeys } from './use-condominiums'

export interface UseToggleCondominiumStatusOptions {
  onSuccess?: (response: TApiMessageResponse) => void
  onError?: (error: Error) => void
}

export interface TToggleCondominiumStatusVariables {
  condominiumId: string
  isActive: boolean
}

/**
 * Hook to toggle condominium active status.
 */
export function useToggleCondominiumStatus(options: UseToggleCondominiumStatusOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiMessageResponse, TToggleCondominiumStatusVariables>({
    mutationFn: async ({ condominiumId, isActive }) => ({
      method: 'PATCH',
      path: `/condominiums/${condominiumId}/status`,
      body: { isActive },
    }),
    invalidateKeys: [
      condominiumsKeys.all,
      condominiumsKeys.detail('' as string), // This will invalidate all detail queries
    ],
    onSuccess,
    onError,
  })
}
