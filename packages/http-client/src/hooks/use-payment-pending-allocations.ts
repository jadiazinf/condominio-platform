import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TPaymentPendingAllocation } from '@packages/domain'
import { paymentKeys } from './use-payments'
import { quotaKeys } from './use-quotas'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const pendingAllocationKeys = {
  all: ['pending-allocations'] as const,
  lists: () => [...pendingAllocationKeys.all, 'list'] as const,
  list: (status?: string) => [...pendingAllocationKeys.lists(), { status }] as const,
  byPayment: (paymentId: string) => [...pendingAllocationKeys.all, 'payment', paymentId] as const,
  detail: (id: string) => [...pendingAllocationKeys.all, 'detail', id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IAllocatePendingData {
  quotaId: string
  resolutionNotes?: string | null
}

export interface IRefundPendingData {
  resolutionNotes: string
}

export interface IRefundViaBankResponse {
  data: TPaymentPendingAllocation
  refundId: string | null
  refundStatus: string
  message: string
}

export interface IAllocatePendingOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPaymentPendingAllocation>>) => void
  onError?: (error: Error) => void
}

export interface IRefundPendingOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPaymentPendingAllocation>>) => void
  onError?: (error: Error) => void
}

export interface IRefundViaBankOptions {
  onSuccess?: (data: ApiResponse<IRefundViaBankResponse>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Pending Allocations
// ─────────────────────────────────────────────────────────────────────────────

export function usePendingAllocations(options?: { status?: string; enabled?: boolean }) {
  const { status, enabled = true } = options ?? {}

  const params = new URLSearchParams()
  if (status) params.set('status', status)

  const queryString = params.toString()
  const path = `/condominium/payment-pending-allocations${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiDataResponse<TPaymentPendingAllocation[]>>({
    path,
    queryKey: pendingAllocationKeys.list(status),
    config: {},
    enabled,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Allocations by Payment
// ─────────────────────────────────────────────────────────────────────────────

export function usePendingAllocationsByPayment(paymentId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPaymentPendingAllocation[]>>({
    path: `/condominium/payment-pending-allocations/payment/${paymentId}`,
    queryKey: pendingAllocationKeys.byPayment(paymentId),
    config: {},
    enabled: options?.enabled !== false && !!paymentId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Allocation Detail
// ─────────────────────────────────────────────────────────────────────────────

export function usePendingAllocationDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPaymentPendingAllocation>>({
    path: `/condominium/payment-pending-allocations/${id}`,
    queryKey: pendingAllocationKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Allocate Pending to Quota
// ─────────────────────────────────────────────────────────────────────────────

export function useAllocatePending(id: string, options?: IAllocatePendingOptions) {
  return useApiMutation<TApiDataResponse<TPaymentPendingAllocation>, IAllocatePendingData>({
    path: `/condominium/payment-pending-allocations/${id}/allocate`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      pendingAllocationKeys.all,
      paymentKeys.all,
      quotaKeys.all,
    ],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Refund Pending (Simple)
// ─────────────────────────────────────────────────────────────────────────────

export function useRefundPending(id: string, options?: IRefundPendingOptions) {
  return useApiMutation<TApiDataResponse<TPaymentPendingAllocation>, IRefundPendingData>({
    path: `/condominium/payment-pending-allocations/${id}/refund`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [pendingAllocationKeys.all, paymentKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Refund via Bank
// ─────────────────────────────────────────────────────────────────────────────

export function useRefundPendingViaBank(id: string, options?: IRefundViaBankOptions) {
  return useApiMutation<IRefundViaBankResponse, IRefundPendingData>({
    path: `/condominium/payment-pending-allocations/${id}/refund-via-bank`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [pendingAllocationKeys.all, paymentKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingAllocations(status?: string): Promise<TPaymentPendingAllocation[]> {
  const client = getHttpClient()
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  const queryString = params.toString()
  const path = `/condominium/payment-pending-allocations${queryString ? `?${queryString}` : ''}`
  const response = await client.get<TApiDataResponse<TPaymentPendingAllocation[]>>(path)
  return response.data.data
}

export async function getPendingAllocationsByPayment(paymentId: string): Promise<TPaymentPendingAllocation[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPaymentPendingAllocation[]>>(
    `/condominium/payment-pending-allocations/payment/${paymentId}`
  )
  return response.data.data
}

export async function allocatePending(
  id: string,
  data: IAllocatePendingData
): Promise<TPaymentPendingAllocation> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TPaymentPendingAllocation>>(
    `/condominium/payment-pending-allocations/${id}/allocate`,
    data
  )
  return response.data.data
}

export async function refundPending(
  id: string,
  data: IRefundPendingData
): Promise<TPaymentPendingAllocation> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TPaymentPendingAllocation>>(
    `/condominium/payment-pending-allocations/${id}/refund`,
    data
  )
  return response.data.data
}

export async function refundPendingViaBank(
  id: string,
  data: IRefundPendingData
): Promise<IRefundViaBankResponse> {
  const client = getHttpClient()
  const response = await client.post<IRefundViaBankResponse>(
    `/condominium/payment-pending-allocations/${id}/refund-via-bank`,
    data
  )
  return response.data
}
