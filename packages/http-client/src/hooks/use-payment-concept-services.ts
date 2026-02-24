import { useApiQuery, useApiMutation } from './use-api-query'
import type { TPaymentConceptService } from '@packages/domain'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import { paymentConceptKeys } from './use-payment-concepts'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const paymentConceptServiceKeys = {
  all: ['payment-concept-services'] as const,
  byConceptId: (companyId: string, conceptId: string) =>
    [...paymentConceptServiceKeys.all, 'by-concept', companyId, conceptId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUsePaymentConceptServicesOptions {
  companyId: string
  conceptId: string
  enabled?: boolean
}

export interface ILinkServiceToConceptVariables {
  conceptId: string
  serviceId: string
  amount: number
  useDefaultAmount: boolean
}

export interface IUnlinkServiceFromConceptVariables {
  conceptId: string
  linkId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentConceptServices(options: IUsePaymentConceptServicesOptions) {
  const { companyId, conceptId, enabled = true } = options

  return useApiQuery<TApiDataResponse<(TPaymentConceptService & { serviceName: string; providerType: string })[]>>({
    path: `/${companyId}/me/payment-concepts/${conceptId}/services`,
    queryKey: paymentConceptServiceKeys.byConceptId(companyId, conceptId),
    enabled: enabled && !!companyId && !!conceptId,
  })
}

export function useLinkServiceToConcept(companyId: string) {
  return useApiMutation<TApiDataResponse<TPaymentConceptService>, ILinkServiceToConceptVariables>({
    path: (variables) =>
      `/${companyId}/me/payment-concepts/${variables.conceptId}/services`,
    method: 'POST',
    invalidateKeys: [paymentConceptServiceKeys.all, paymentConceptKeys.all],
  })
}

export function useUnlinkServiceFromConcept(companyId: string) {
  return useApiMutation<TApiDataResponse<{ success: boolean }>, IUnlinkServiceFromConceptVariables>({
    path: (variables) =>
      `/${companyId}/me/payment-concepts/${variables.conceptId}/services/${variables.linkId}`,
    method: 'DELETE',
    invalidateKeys: [paymentConceptServiceKeys.all, paymentConceptKeys.all],
  })
}
