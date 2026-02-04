import type { TCondominium, TCondominiumCreate, TCondominiumsQuery } from '@packages/domain'
import type { TApiDataResponse, TApiPaginatedResponse, ApiResponse } from '../types'

import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client'

export interface UseCondominiumsOptions {
  enabled?: boolean
}

export interface UseCondominiumsPaginatedOptions {
  token: string
  query: TCondominiumsQuery
  enabled?: boolean
}

export const condominiumsKeys = {
  all: ['condominiums'] as const,
  list: () => [...condominiumsKeys.all, 'list'] as const,
  paginated: (query: TCondominiumsQuery) => [...condominiumsKeys.all, 'paginated', query] as const,
  detail: (id: string) => [...condominiumsKeys.all, 'detail', id] as const,
}

/**
 * Hook to get all condominiums in the system.
 * This is typically used by superadmins.
 * @deprecated Use useCondominiumsPaginated instead
 */
export function useCondominiums(options: UseCondominiumsOptions = {}) {
  const { enabled = true } = options

  return useApiQuery<TApiDataResponse<TCondominium[]>>({
    path: '/condominiums',
    queryKey: condominiumsKeys.list(),
    enabled,
  })
}

/**
 * Hook to fetch condominiums with pagination and filtering.
 */
export function useCondominiumsPaginated(options: UseCondominiumsPaginatedOptions) {
  const { token, query, enabled = true } = options

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
  if (query.locationId) params.set('locationId', query.locationId)

  const queryString = params.toString()
  const path = `/condominiums${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TCondominium>>({
    path,
    queryKey: condominiumsKeys.paginated(query),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

/**
 * Server-side function to get all condominiums.
 * @deprecated Use getCondominiumsPaginated instead
 */
export async function getAllCondominiums(token?: string): Promise<TCondominium[]> {
  const client = getHttpClient()

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await client.get<TApiDataResponse<TCondominium[]>>('/condominiums', { headers })

  return response.data.data
}

/**
 * Server-side function to get condominiums with pagination and filtering.
 */
export async function getCondominiumsPaginated(
  token: string,
  query: TCondominiumsQuery
): Promise<TApiPaginatedResponse<TCondominium>> {
  const client = getHttpClient()

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
  if (query.locationId) params.set('locationId', query.locationId)

  const queryString = params.toString()
  const path = `/condominiums${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiPaginatedResponse<TCondominium>>(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}

// ============================================
// CREATE CONDOMINIUM
// ============================================

export interface UseCreateCondominiumOptions {
  token: string
  onSuccess?: (data: TCondominium) => void
  onError?: (error: Error) => void
}

/**
 * Hook to create a new condominium.
 */
export function useCreateCondominium(options: UseCreateCondominiumOptions) {
  const { token, onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TCondominium>, TCondominiumCreate>({
    path: '/condominiums',
    method: 'POST',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    invalidateKeys: [condominiumsKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TCondominium>>) => {
      onSuccess?.(response.data.data)
    },
    onError,
  })
}

/**
 * Server-side function to create a condominium.
 */
export async function createCondominium(
  token: string,
  data: TCondominiumCreate
): Promise<TCondominium> {
  const client = getHttpClient()

  const response = await client.post<TApiDataResponse<TCondominium>>('/condominiums', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

// ============================================
// GENERATE CONDOMINIUM CODE
// ============================================

export interface TGenerateCondominiumCodeResponse {
  code: string
}

export interface UseGenerateCondominiumCodeOptions {
  token: string
  onSuccess?: (data: TGenerateCondominiumCodeResponse) => void
  onError?: (error: Error) => void
}

/**
 * Hook to generate a unique condominium code.
 */
export function useGenerateCondominiumCode(options: UseGenerateCondominiumCodeOptions) {
  const { token, onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TGenerateCondominiumCodeResponse>, void>({
    path: '/condominiums/generate-code',
    method: 'POST',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    onSuccess: (response: ApiResponse<TApiDataResponse<TGenerateCondominiumCodeResponse>>) => {
      onSuccess?.(response.data.data)
    },
    onError,
  })
}

/**
 * Server-side function to generate a unique condominium code.
 */
export async function generateCondominiumCode(
  token: string
): Promise<TGenerateCondominiumCodeResponse> {
  const client = getHttpClient()

  const response = await client.post<TApiDataResponse<TGenerateCondominiumCodeResponse>>(
    '/condominiums/generate-code',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}
