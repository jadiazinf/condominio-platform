import { useApiQuery } from './use-api-query'
import type { TPaymentConcept, TPaymentConceptsQuery } from '@packages/domain'
import type { TApiPaginatedResponse } from '../types/api-responses'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const paymentConceptKeys = {
  all: ['payment-concepts'] as const,
  myCompanyPaginated: (companyId: string, query: TPaymentConceptsQuery) =>
    [...paymentConceptKeys.all, 'my-company-paginated', companyId, query] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseMyCompanyPaymentConceptsPaginatedOptions {
  companyId: string
  query: TPaymentConceptsQuery
  enabled?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch paginated payment concepts across all condominiums of a management company.
 */
export function useMyCompanyPaymentConceptsPaginated(
  options: IUseMyCompanyPaymentConceptsPaginatedOptions
) {
  const { companyId, query, enabled = true } = options

  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.conceptType) params.set('conceptType', query.conceptType)
  if (query.condominiumId) params.set('condominiumId', query.condominiumId)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
  if (query.isRecurring !== undefined) params.set('isRecurring', String(query.isRecurring))

  const queryString = params.toString()
  const path = `/platform/management-companies/${companyId}/me/payment-concepts${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TPaymentConcept & { condominiumName: string | null }>>({
    path,
    queryKey: paymentConceptKeys.myCompanyPaginated(companyId, query),
    enabled: enabled && !!companyId,
  })
}
