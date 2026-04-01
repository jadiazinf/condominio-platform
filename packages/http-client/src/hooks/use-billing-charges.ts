import { useApiMutation, useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TCharge } from '@packages/domain'

// ─── Query Keys ───

export const billingChargeKeys = {
  all: ['billing-charges'] as const,
  lists: () => [...billingChargeKeys.all, 'list'] as const,
  byUnitAndChannel: (unitId: string, channelId: string) =>
    [...billingChargeKeys.lists(), unitId, channelId] as const,
  detail: (id: string) => [...billingChargeKeys.all, 'detail', id] as const,
}

// ─── Hooks ───

export function useBillingCharges(
  params: { unitId?: string; channelId?: string; periodYear?: number; periodMonth?: number },
  options?: { enabled?: boolean }
) {
  const searchParams = new URLSearchParams()
  if (params.unitId) searchParams.set('unitId', params.unitId)
  if (params.channelId) searchParams.set('channelId', params.channelId)
  if (params.periodYear) searchParams.set('periodYear', String(params.periodYear))
  if (params.periodMonth) searchParams.set('periodMonth', String(params.periodMonth))

  return useApiQuery<TApiDataResponse<TCharge[]>>({
    path: `/billing/charges?${searchParams.toString()}`,
    queryKey: [...billingChargeKeys.lists(), params],
    config: {},
    enabled: options?.enabled !== false,
  })
}

export function useBillingChargeDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TCharge>>({
    path: `/billing/charges/${id}`,
    queryKey: billingChargeKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

export function useCancelCharge(options?: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<TCharge>, { chargeId: string }>({
    path: '', // overridden per call
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [billingChargeKeys.all, ['billing-receipts']],
  })
}

export function useIssueCreditNote(chargeId: string, options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<any>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<any>, { amount: string; reason: string; sourceChargeId?: string }>({
    path: `/billing/charges/${chargeId}/credit-note`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [billingChargeKeys.all, ['billing-ledger']],
  })
}

export function useIssueDebitNote(chargeId: string, options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<any>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<any>, { amount: string; reason: string }>({
    path: `/billing/charges/${chargeId}/debit-note`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [billingChargeKeys.all, ['billing-ledger']],
  })
}
