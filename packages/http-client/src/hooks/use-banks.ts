import { useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { TBank, TBanksQuery } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const bankKeys = {
  all: ['banks'] as const,
  list: (query: TBanksQuery) => [...bankKeys.all, 'list', query] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseBanksOptions {
  country?: string
  accountCategory?: string
  search?: string
  enabled?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch banks catalog filtered by country, category, or search
 */
export function useBanks(options: IUseBanksOptions = {}) {
  const { country, accountCategory, search, enabled = true } = options

  const params = new URLSearchParams()
  if (country) params.set('country', country)
  if (accountCategory) params.set('accountCategory', accountCategory)
  if (search) params.set('search', search)

  const queryString = params.toString()
  const path = `/banks${queryString ? `?${queryString}` : ''}`

  const query: TBanksQuery = { country, accountCategory, search }

  return useApiQuery<TApiDataResponse<TBank[]>>({
    path,
    queryKey: bankKeys.list(query),
    enabled,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standalone function to fetch banks catalog
 */
export async function getBanks(query: TBanksQuery = {}): Promise<TBank[]> {
  const client = getHttpClient()

  const params = new URLSearchParams()
  if (query.country) params.set('country', query.country)
  if (query.accountCategory) params.set('accountCategory', query.accountCategory)
  if (query.search) params.set('search', query.search)

  const queryString = params.toString()
  const path = `/banks${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiDataResponse<TBank[]>>(path)
  return response.data.data
}
