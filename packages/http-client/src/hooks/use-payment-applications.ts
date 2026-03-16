import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TPaymentApplication } from '@packages/domain'
import { paymentKeys } from './use-payments'
import { quotaKeys } from './use-quotas'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const paymentApplicationKeys = {
  all: ['payment-applications'] as const,
  lists: () => [...paymentApplicationKeys.all, 'list'] as const,
  byPayment: (paymentId: string) => [...paymentApplicationKeys.all, 'payment', paymentId] as const,
  byQuota: (quotaId: string) => [...paymentApplicationKeys.all, 'quota', quotaId] as const,
  detail: (id: string) => [...paymentApplicationKeys.all, 'detail', id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IApplyPaymentToQuotaData {
  paymentId: string
  quotaId: string
  appliedAmount: string
}

export interface IApplyPaymentToQuotaResponse {
  data: TPaymentApplication
  quotaUpdated: boolean
  interestReversed: boolean
  excessAmount: string | null
  message: string
}

export interface IApplyPaymentOptions {
  onSuccess?: (data: ApiResponse<IApplyPaymentToQuotaResponse>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List All Payment Applications
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentApplications(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPaymentApplication[]>>({
    path: '/condominium/payment-applications',
    queryKey: paymentApplicationKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Applications by Payment
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentApplicationsByPayment(
  paymentId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<TPaymentApplication[]>>({
    path: `/condominium/payment-applications/payment/${paymentId}`,
    queryKey: paymentApplicationKeys.byPayment(paymentId),
    config: {},
    enabled: options?.enabled !== false && !!paymentId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Applications by Quota
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentApplicationsByQuota(quotaId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPaymentApplication[]>>({
    path: `/condominium/payment-applications/quota/${quotaId}`,
    queryKey: paymentApplicationKeys.byQuota(quotaId),
    config: {},
    enabled: options?.enabled !== false && !!quotaId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Application Detail
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentApplicationDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPaymentApplication>>({
    path: `/condominium/payment-applications/${id}`,
    queryKey: paymentApplicationKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Apply Payment to Quota
// ─────────────────────────────────────────────────────────────────────────────

export function useApplyPaymentToQuota(options?: IApplyPaymentOptions) {
  return useApiMutation<IApplyPaymentToQuotaResponse, IApplyPaymentToQuotaData>({
    path: '/condominium/payment-applications',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentApplicationKeys.all, paymentKeys.all, quotaKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getPaymentApplications(): Promise<TPaymentApplication[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPaymentApplication[]>>(
    '/condominium/payment-applications'
  )
  return response.data.data
}

export async function getPaymentApplicationsByPayment(
  paymentId: string
): Promise<TPaymentApplication[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPaymentApplication[]>>(
    `/condominium/payment-applications/payment/${paymentId}`
  )
  return response.data.data
}

export async function getPaymentApplicationsByQuota(
  quotaId: string
): Promise<TPaymentApplication[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPaymentApplication[]>>(
    `/condominium/payment-applications/quota/${quotaId}`
  )
  return response.data.data
}

export async function applyPaymentToQuota(
  data: IApplyPaymentToQuotaData
): Promise<IApplyPaymentToQuotaResponse> {
  const client = getHttpClient()
  const response = await client.post<IApplyPaymentToQuotaResponse>(
    '/condominium/payment-applications',
    data
  )
  return response.data
}
