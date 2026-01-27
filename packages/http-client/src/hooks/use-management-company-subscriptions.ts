import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type {
  TManagementCompanySubscription,
  TManagementCompanySubscriptionCreate,
  TManagementCompanySubscriptionUpdate,
} from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const managementCompanySubscriptionKeys = {
  all: ['management-company-subscriptions'] as const,
  lists: () => [...managementCompanySubscriptionKeys.all, 'list'] as const,
  list: (companyId: string) => [...managementCompanySubscriptionKeys.lists(), companyId] as const,
  details: () => [...managementCompanySubscriptionKeys.all, 'detail'] as const,
  detail: (companyId: string) =>
    [...managementCompanySubscriptionKeys.details(), companyId] as const,
  active: (companyId: string) =>
    [...managementCompanySubscriptionKeys.all, 'active', companyId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseManagementCompanySubscriptionOptions {
  enabled?: boolean
}

export interface IUseManagementCompanySubscriptionsOptions {
  enabled?: boolean
}

export interface ICreateSubscriptionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TManagementCompanySubscription>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateSubscriptionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TManagementCompanySubscription>>) => void
  onError?: (error: Error) => void
}

export interface ICancelSubscriptionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<void>>) => void
  onError?: (error: Error) => void
}

export interface IRenewSubscriptionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TManagementCompanySubscription>>) => void
  onError?: (error: Error) => void
}

export interface ICancelSubscriptionData {
  cancelledBy: string
  cancellationReason?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Active Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch the active subscription for a management company
 */
export function useManagementCompanySubscription(
  companyId: string,
  options?: IUseManagementCompanySubscriptionOptions
) {
  return useApiQuery<TApiDataResponse<TManagementCompanySubscription>>({
    path: `/management-companies/${companyId}/subscription`,
    queryKey: managementCompanySubscriptionKeys.active(companyId),
    config: {},
    enabled: options?.enabled !== false && !!companyId,
  })
}

/**
 * Standalone function to fetch active subscription
 */
export async function getManagementCompanySubscription(
  companyId: string
): Promise<TManagementCompanySubscription> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TManagementCompanySubscription>>(
    `/management-companies/${companyId}/subscription`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Subscription History
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch all subscriptions (history) for a management company
 */
export function useManagementCompanySubscriptions(
  companyId: string,
  options?: IUseManagementCompanySubscriptionsOptions
) {
  return useApiQuery<TApiDataResponse<TManagementCompanySubscription[]>>({
    path: `/management-companies/${companyId}/subscriptions`,
    queryKey: managementCompanySubscriptionKeys.list(companyId),
    config: {},
    enabled: options?.enabled !== false && !!companyId,
  })
}

/**
 * Standalone function to fetch subscriptions history
 */
export async function getManagementCompanySubscriptions(
  companyId: string
): Promise<TManagementCompanySubscription[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TManagementCompanySubscription[]>>(
    `/management-companies/${companyId}/subscriptions`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to create a new subscription for a management company
 */
export function useCreateSubscription(companyId: string, options?: ICreateSubscriptionOptions) {
  return useApiMutation<
    TApiDataResponse<TManagementCompanySubscription>,
    TManagementCompanySubscriptionCreate
  >({
    path: `/management-companies/${companyId}/subscription`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanySubscriptionKeys.active(companyId),
      managementCompanySubscriptionKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to create a subscription
 */
export async function createSubscription(
  companyId: string,
  data: TManagementCompanySubscriptionCreate
): Promise<TManagementCompanySubscription> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TManagementCompanySubscription>>(
    `/management-companies/${companyId}/subscription`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to update a subscription
 */
export function useUpdateSubscription(companyId: string, options?: IUpdateSubscriptionOptions) {
  return useApiMutation<
    TApiDataResponse<TManagementCompanySubscription>,
    TManagementCompanySubscriptionUpdate
  >({
    path: `/management-companies/${companyId}/subscription`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanySubscriptionKeys.active(companyId),
      managementCompanySubscriptionKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to update a subscription
 */
export async function updateSubscription(
  companyId: string,
  data: TManagementCompanySubscriptionUpdate
): Promise<TManagementCompanySubscription> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TManagementCompanySubscription>>(
    `/management-companies/${companyId}/subscription`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Cancel Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to cancel a subscription
 */
export function useCancelSubscription(companyId: string, options?: ICancelSubscriptionOptions) {
  return useApiMutation<TApiDataResponse<void>, ICancelSubscriptionData>({
    path: `/management-companies/${companyId}/subscription`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanySubscriptionKeys.active(companyId),
      managementCompanySubscriptionKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to cancel a subscription
 * Note: This uses query params to pass cancellation data since HTTP client DELETE doesn't support body
 */
export async function cancelSubscription(
  companyId: string,
  data: ICancelSubscriptionData
): Promise<void> {
  const client = getHttpClient()
  const params: Record<string, string> = {
    cancelledBy: data.cancelledBy,
  }
  if (data.cancellationReason) {
    params.cancellationReason = data.cancellationReason
  }

  await client.delete<TApiDataResponse<void>>(`/management-companies/${companyId}/subscription`, {
    params,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Renew Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to renew a subscription
 */
export function useRenewSubscription(companyId: string, options?: IRenewSubscriptionOptions) {
  return useApiMutation<TApiDataResponse<TManagementCompanySubscription>, void>({
    path: `/management-companies/${companyId}/subscription/renew`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanySubscriptionKeys.active(companyId),
      managementCompanySubscriptionKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to renew a subscription
 */
export async function renewSubscription(
  companyId: string
): Promise<TManagementCompanySubscription> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TManagementCompanySubscription>>(
    `/management-companies/${companyId}/subscription/renew`
  )

  return response.data.data
}
