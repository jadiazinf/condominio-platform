import { useApiMutation, useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TBillingReceipt } from '@packages/domain'

// ─── Query Keys ───

export const billingReceiptKeys = {
  all: ['billing-receipts'] as const,
  lists: () => [...billingReceiptKeys.all, 'list'] as const,
  byCondominiumAndPeriod: (condominiumId: string, year: number, month: number) =>
    [...billingReceiptKeys.lists(), condominiumId, year, month] as const,
  detail: (id: string) => [...billingReceiptKeys.all, 'detail', id] as const,
}

// ─── Hooks ───

export function useBillingReceipts(
  params: { condominiumId?: string; periodYear?: number; periodMonth?: number },
  options?: { enabled?: boolean }
) {
  const searchParams = new URLSearchParams()
  if (params.condominiumId) searchParams.set('condominiumId', params.condominiumId)
  if (params.periodYear) searchParams.set('periodYear', String(params.periodYear))
  if (params.periodMonth) searchParams.set('periodMonth', String(params.periodMonth))

  return useApiQuery<TApiDataResponse<TBillingReceipt[]>>({
    path: `/billing/receipts?${searchParams.toString()}`,
    queryKey: [...billingReceiptKeys.lists(), params],
    config: {},
    enabled: options?.enabled !== false,
  })
}

export function useBillingReceiptDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TBillingReceipt>>({
    path: `/billing/receipts/${id}`,
    queryKey: billingReceiptKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

export function useVoidReceipt(receiptId: string, options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<any>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<any>, { voidReason: string; generateReplacement?: boolean }>({
    path: `/billing/receipts/${receiptId}/void`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [billingReceiptKeys.all, ['billing-charges'], ['billing-ledger']],
  })
}
