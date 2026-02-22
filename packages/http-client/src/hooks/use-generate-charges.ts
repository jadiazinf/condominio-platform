import { useApiMutation } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import { paymentConceptKeys } from './use-payment-concepts'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IGenerateChargesVariables {
  periodYear: number
  periodMonth: number
}

export interface IGenerateChargesResult {
  quotasCreated: number
  totalAmount: number
  unitDetails: Array<{
    unitId: string
    amount: number
  }>
}

export interface IGenerateChargesOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<IGenerateChargesResult>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useGenerateCharges(
  companyId: string,
  conceptId: string,
  options?: IGenerateChargesOptions
) {
  return useApiMutation<TApiDataResponse<IGenerateChargesResult>, IGenerateChargesVariables>({
    path: `/${companyId}/me/payment-concepts/${conceptId}/generate`,
    method: 'POST',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentConceptKeys.all, ['quotas']],
  })
}
