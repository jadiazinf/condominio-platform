import type { TCondominium } from '@packages/domain'
import type { TApiDataResponse } from '../types'

import { useApiQuery } from './use-api-query'
import { getHttpClient } from '../client'
import { condominiumsKeys } from './use-condominiums'

export interface UseCondominiumDetailOptions {
  token: string
  condominiumId: string
  enabled?: boolean
}

/**
 * Hook to get detailed information about a specific condominium.
 * This includes all relations like management company, location, currency, etc.
 */
export function useCondominiumDetail(options: UseCondominiumDetailOptions) {
  const { token, condominiumId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TCondominium>>({
    path: `/condominium/condominiums/${condominiumId}`,
    queryKey: condominiumsKeys.detail(condominiumId),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

/**
 * Server-side function to get condominium details.
 */
export async function getCondominiumDetail(
  token: string,
  condominiumId: string,
  managementCompanyId?: string
): Promise<TCondominium> {
  const client = getHttpClient()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'x-condominium-id': condominiumId,
  }

  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  const response = await client.get<TApiDataResponse<TCondominium>>(
    `/condominium/condominiums/${condominiumId}`,
    { headers }
  )

  return response.data.data
}
