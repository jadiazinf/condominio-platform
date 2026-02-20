import type { TCondominiumAccessCode } from '@packages/domain'
import type { TApiDataResponse } from '../types'
import type { ApiResponse } from '../types/http'

import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client'

// Query keys for access codes
export const accessCodesKeys = {
  all: ['access-codes'] as const,
  active: (condominiumId: string) => [...accessCodesKeys.all, 'active', condominiumId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

export interface UseActiveAccessCodeOptions {
  token: string
  condominiumId: string
  enabled?: boolean
}

/**
 * Hook to get the active access code for a condominium.
 */
export function useActiveAccessCode(options: UseActiveAccessCodeOptions) {
  const { token, condominiumId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TCondominiumAccessCode | null>>({
    path: '/condominium/access-codes/active',
    queryKey: accessCodesKeys.active(condominiumId),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export interface UseGenerateAccessCodeOptions {
  condominiumId: string
  onSuccess?: (response: TApiDataResponse<TCondominiumAccessCode>) => void
  onError?: (error: Error) => void
}

export interface TGenerateAccessCodeVariables {
  validity: '1_day' | '7_days' | '1_month' | '1_year'
}

/**
 * Hook to generate a new access code for a condominium.
 */
export function useGenerateAccessCode(options: UseGenerateAccessCodeOptions) {
  const { condominiumId, onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TCondominiumAccessCode>, TGenerateAccessCodeVariables>({
    path: '/condominium/access-codes/generate',
    method: 'POST',
    config: {
      headers: {
        'x-condominium-id': condominiumId,
      },
    },
    invalidateKeys: [accessCodesKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TCondominiumAccessCode>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

// ============================================================================
// Server-side Functions
// ============================================================================

/**
 * Server-side function to get the active access code for a condominium.
 */
export async function getActiveAccessCode(
  token: string,
  condominiumId: string,
  managementCompanyId?: string
): Promise<TCondominiumAccessCode | null> {
  const client = getHttpClient()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'x-condominium-id': condominiumId,
  }

  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  const response = await client.get<TApiDataResponse<TCondominiumAccessCode | null>>(
    '/condominium/access-codes/active',
    { headers }
  )

  return response.data.data
}
