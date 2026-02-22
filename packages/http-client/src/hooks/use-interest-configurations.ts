import { useApiMutation } from './use-api-query'
import type { TInterestConfiguration, TInterestConfigurationCreate } from '@packages/domain'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const interestConfigurationKeys = {
  all: ['interest-configurations'] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ICreateInterestConfigurationOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TInterestConfiguration>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateInterestConfiguration(options?: ICreateInterestConfigurationOptions) {
  return useApiMutation<TApiDataResponse<TInterestConfiguration>, TInterestConfigurationCreate>({
    path: '/condominium/interest-configurations',
    method: 'POST',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [interestConfigurationKeys.all],
  })
}
