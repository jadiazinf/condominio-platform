import type { TCondominium, TCondominiumsQuery } from '@packages/domain'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types'

import { useApiQuery } from './use-api-query'
import { getHttpClient } from '../client'

export interface UseCompanyCondominiumsOptions {
  token?: string
  enabled?: boolean
}

export interface UseCompanyCondominiumsPaginatedOptions {
  companyId: string
  query: TCondominiumsQuery
  enabled?: boolean
}

export const companyCondominiumsKeys = {
  all: ['company-condominiums'] as const,
  list: (companyId: string) => [...companyCondominiumsKeys.all, 'list', companyId] as const,
  paginated: (companyId: string, query: TCondominiumsQuery) =>
    [...companyCondominiumsKeys.all, 'paginated', companyId, query] as const,
}

/**
 * Hook to get all condominiums for a specific management company.
 * @deprecated Use useCompanyCondominiumsPaginated instead
 */
export function useCompanyCondominiums(
  companyId: string,
  options: UseCompanyCondominiumsOptions = {}
) {
  const { token, enabled = true } = options

  return useApiQuery<TApiDataResponse<TCondominium[]>>({
    path: `/platform/condominiums/management-company/${companyId}`,
    queryKey: companyCondominiumsKeys.list(companyId),
    config: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
    enabled: enabled && !!companyId && !!token,
  })
}

/**
 * Hook to get condominiums for a management company with pagination and filtering.
 */
export function useCompanyCondominiumsPaginated(options: UseCompanyCondominiumsPaginatedOptions) {
  const { companyId, query, enabled = true } = options

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/platform/condominiums/management-company/${companyId}${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TCondominium>>({
    path,
    queryKey: companyCondominiumsKeys.paginated(companyId, query),
    enabled: enabled && !!companyId,
  })
}

/**
 * Server-side function to get all condominiums for a specific management company.
 */
export async function getCompanyCondominiums(
  token: string,
  companyId: string
): Promise<TCondominium[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TCondominium[]>>(
    `/platform/condominiums/management-company/${companyId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Server-side function to get condominiums with pagination for a management company.
 */
export async function getCompanyCondominiumsPaginated(
  token: string,
  companyId: string,
  query: TCondominiumsQuery
): Promise<TApiPaginatedResponse<TCondominium>> {
  const client = getHttpClient()

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/platform/condominiums/management-company/${companyId}${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiPaginatedResponse<TCondominium>>(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}
