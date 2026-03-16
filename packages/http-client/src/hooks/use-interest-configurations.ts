import { useApiQuery, useApiMutation } from './use-api-query'
import type { TInterestConfiguration, TInterestConfigurationCreate } from '@packages/domain'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const interestConfigurationKeys = {
  all: ['interest-configurations'] as const,
  byPaymentConcept: (paymentConceptId: string) =>
    [...interestConfigurationKeys.all, 'by-payment-concept', paymentConceptId] as const,
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

export interface IUseInterestConfigsByPaymentConceptOptions {
  paymentConceptId: string
  enabled?: boolean
}

export function useInterestConfigsByPaymentConcept(
  options: IUseInterestConfigsByPaymentConceptOptions
) {
  const { paymentConceptId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TInterestConfiguration[]>>({
    path: `/condominium/interest-configurations/payment-concept/${paymentConceptId}`,
    queryKey: interestConfigurationKeys.byPaymentConcept(paymentConceptId),
    enabled: enabled && !!paymentConceptId,
  })
}

export function useCreateInterestConfiguration(options?: ICreateInterestConfigurationOptions) {
  return useApiMutation<TApiDataResponse<TInterestConfiguration>, TInterestConfigurationCreate>({
    path: '/condominium/interest-configurations',
    method: 'POST',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [interestConfigurationKeys.all],
  })
}
