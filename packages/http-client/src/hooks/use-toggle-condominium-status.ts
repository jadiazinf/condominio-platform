import type { TApiMessageResponse } from '../types'
import type { ApiResponse } from '../types/http'
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
    path: (variables: TToggleCondominiumStatusVariables) =>
      `/condominium/condominiums/${variables.condominiumId}/status`,
    method: 'PATCH',
    invalidateKeys: [
      condominiumsKeys.all,
      condominiumsKeys.detail('' as string), // This will invalidate all detail queries
    ],
    onSuccess: (response: ApiResponse<TApiMessageResponse>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}
