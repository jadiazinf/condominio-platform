import type { TCondominium } from '@packages/domain'
import type { TApiDataResponse } from '../types'

import { useApiQuery } from './use-api-query'

export interface UseCompanyCondominiumsOptions {
  enabled?: boolean
}

export const companyCondominiumsKeys = {
  all: ['company-condominiums'] as const,
  list: (companyId: string) => [...companyCondominiumsKeys.all, 'list', companyId] as const,
}

/**
 * Hook to get all condominiums for a specific management company.
 */
export function useCompanyCondominiums(
  companyId: string,
  options: UseCompanyCondominiumsOptions = {}
) {
  const { enabled = true } = options

  return useApiQuery<TApiDataResponse<TCondominium[]>>({
    path: `/condominiums/management-company/${companyId}`,
    queryKey: companyCondominiumsKeys.list(companyId),
    enabled: enabled && !!companyId,
  })
}
