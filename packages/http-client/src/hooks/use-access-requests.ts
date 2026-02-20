import type { TAccessRequest, TAccessCodeValidity, TPaginatedResponse } from '@packages/domain'
import type { TApiDataResponse, TApiMessageResponse } from '../types'
import type { ApiResponse } from '../types/http'

import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client'

// Query keys for access requests
export const accessRequestsKeys = {
  all: ['access-requests'] as const,
  byCondominium: (condominiumId: string) =>
    [...accessRequestsKeys.all, 'condominium', condominiumId] as const,
  byCondominiumFiltered: (condominiumId: string, filters: Record<string, unknown>) =>
    [...accessRequestsKeys.all, 'condominium', condominiumId, filters] as const,
  pendingCount: (condominiumId: string) =>
    [...accessRequestsKeys.all, 'pending-count', condominiumId] as const,
  mine: ['my-access-requests'] as const,
  mineFiltered: (filters: Record<string, unknown>) =>
    [...accessRequestsKeys.mine, filters] as const,
}

// ============================================================================
// Admin Query Hooks
// ============================================================================

export interface UseCondominiumAccessRequestsOptions {
  condominiumId: string
  managementCompanyId?: string
  page?: number
  limit?: number
  status?: string
  search?: string
  enabled?: boolean
}

/**
 * Hook to get paginated access requests for a condominium (admin).
 */
export function useCondominiumAccessRequests(options: UseCondominiumAccessRequestsOptions) {
  const { condominiumId, managementCompanyId, page = 1, limit = 20, status, search, enabled = true } = options

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (status) params.set('status', status)
  if (search) params.set('search', search)

  const path = `/condominium/access-requests?${params.toString()}`

  const headers: Record<string, string> = {
    'x-condominium-id': condominiumId,
  }
  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  return useApiQuery<TPaginatedResponse<TAccessRequest>>({
    path,
    queryKey: accessRequestsKeys.byCondominiumFiltered(condominiumId, { page, limit, status, search }),
    config: { headers },
    enabled,
  })
}

export interface UsePendingRequestsCountOptions {
  token: string
  condominiumId: string
  enabled?: boolean
}

/**
 * Hook to get the count of pending requests for a condominium (admin).
 */
export function usePendingRequestsCount(options: UsePendingRequestsCountOptions) {
  const { token, condominiumId, enabled = true } = options

  return useApiQuery<TApiDataResponse<{ count: number }>>({
    path: '/condominium/access-requests/count',
    queryKey: accessRequestsKeys.pendingCount(condominiumId),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

// ============================================================================
// Admin Mutation Hooks
// ============================================================================

export interface UseReviewAccessRequestOptions {
  condominiumId: string
  managementCompanyId?: string
  onSuccess?: (response: TApiDataResponse<TAccessRequest>) => void
  onError?: (error: Error) => void
}

export interface TReviewAccessRequestVariables {
  requestId: string
  status: 'approved' | 'rejected'
  adminNotes?: string
}

/**
 * Hook to review (approve/reject) an access request.
 */
export function useReviewAccessRequest(options: UseReviewAccessRequestOptions) {
  const { condominiumId, managementCompanyId, onSuccess, onError } = options

  const headers: Record<string, string> = {
    'x-condominium-id': condominiumId,
  }
  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  return useApiMutation<TApiDataResponse<TAccessRequest>, TReviewAccessRequestVariables>({
    path: (variables: TReviewAccessRequestVariables) =>
      `/condominium/access-requests/${variables.requestId}/review`,
    method: 'PATCH',
    config: { headers },
    invalidateKeys: [accessRequestsKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TAccessRequest>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

// ============================================================================
// User Query Hooks
// ============================================================================

export interface UseMyAccessRequestsOptions {
  page?: number
  limit?: number
  status?: string
  enabled?: boolean
}

/**
 * Hook to get the current user's access requests (paginated).
 */
export function useMyAccessRequests(options: UseMyAccessRequestsOptions = {}) {
  const { page = 1, limit = 20, status, enabled = true } = options

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (status) params.set('status', status)

  const path = `/me/access-requests?${params.toString()}`

  return useApiQuery<TPaginatedResponse<TAccessRequest>>({
    path,
    queryKey: accessRequestsKeys.mineFiltered({ page, limit, status }),
    enabled,
  })
}

// ============================================================================
// User Mutation Hooks
// ============================================================================

export interface TValidateAccessCodeResponse {
  condominium: {
    id: string
    name: string
    address?: string | null
    email?: string | null
    phone?: string | null
    phoneCountryCode?: string | null
  }
  buildings: Array<{
    id: string
    name: string
    units: Array<{
      id: string
      unitNumber: string
    }>
  }>
  accessCodeId: string
}

export interface UseValidateAccessCodeOptions {
  onSuccess?: (response: TApiDataResponse<TValidateAccessCodeResponse>) => void
  onError?: (error: Error) => void
}

export interface TValidateAccessCodeVariables {
  code: string
}

/**
 * Hook to validate an access code and get condominium info.
 */
export function useValidateAccessCode(options: UseValidateAccessCodeOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TValidateAccessCodeResponse>, TValidateAccessCodeVariables>({
    path: '/me/access-requests/validate-code',
    method: 'POST',
    onSuccess: (response: ApiResponse<TApiDataResponse<TValidateAccessCodeResponse>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseSubmitAccessRequestOptions {
  onSuccess?: (response: TApiDataResponse<TAccessRequest>) => void
  onError?: (error: Error) => void
}

export interface TSubmitAccessRequestVariables {
  accessCodeId: string
  unitId: string
  ownershipType: string
}

/**
 * Hook to submit an access request.
 */
export function useSubmitAccessRequest(options: UseSubmitAccessRequestOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TAccessRequest>, TSubmitAccessRequestVariables>({
    path: '/me/access-requests',
    method: 'POST',
    invalidateKeys: [accessRequestsKeys.mine],
    onSuccess: (response: ApiResponse<TApiDataResponse<TAccessRequest>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

// ============================================================================
// Server-side Functions
// ============================================================================

/**
 * Server-side function to get paginated access requests for a condominium.
 */
export async function getCondominiumAccessRequests(
  token: string,
  condominiumId: string,
  managementCompanyId?: string,
  options?: { page?: number; limit?: number; status?: string; search?: string }
): Promise<TPaginatedResponse<TAccessRequest>> {
  const client = getHttpClient()
  const params = new URLSearchParams()
  if (options?.page) params.set('page', String(options.page))
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.status) params.set('status', options.status)
  if (options?.search) params.set('search', options.search)

  const qs = params.toString()
  const path = `/condominium/access-requests${qs ? `?${qs}` : ''}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'x-condominium-id': condominiumId,
  }

  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  const response = await client.get<TPaginatedResponse<TAccessRequest>>(path, { headers })
  return response.data
}

/**
 * Server-side function to get the current user's access requests (paginated).
 */
export async function getMyAccessRequests(
  token: string,
  options?: { page?: number; limit?: number; status?: string }
): Promise<TPaginatedResponse<TAccessRequest>> {
  const client = getHttpClient()
  const params = new URLSearchParams()
  if (options?.page) params.set('page', String(options.page))
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.status) params.set('status', options.status)

  const qs = params.toString()
  const path = `/me/access-requests${qs ? `?${qs}` : ''}`

  const response = await client.get<TPaginatedResponse<TAccessRequest>>(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * Server-side function to get the count of pending requests.
 */
export async function getPendingRequestsCount(
  token: string,
  condominiumId: string,
  managementCompanyId?: string
): Promise<number> {
  const client = getHttpClient()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'x-condominium-id': condominiumId,
  }

  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  const response = await client.get<TApiDataResponse<{ count: number }>>(
    '/condominium/access-requests/count',
    { headers }
  )
  return response.data.data.count
}
