import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type {
  TPaymentConcept,
  TPaymentConceptCreate,
  TPaymentConceptUpdate,
  TPaymentConceptsQuery,
  TPaymentConceptAssignment,
  TPaymentConceptBankAccount,
} from '@packages/domain'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const paymentConceptKeys = {
  all: ['payment-concepts'] as const,
  myCompanyPaginated: (companyId: string, query: TPaymentConceptsQuery) =>
    [...paymentConceptKeys.all, 'my-company-paginated', companyId, query] as const,
  detail: (companyId: string, conceptId: string) =>
    [...paymentConceptKeys.all, 'detail', companyId, conceptId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseMyCompanyPaymentConceptsPaginatedOptions {
  companyId: string
  query: TPaymentConceptsQuery
  enabled?: boolean
}

export interface IUsePaymentConceptDetailOptions {
  companyId: string
  conceptId: string
  enabled?: boolean
}

type TConceptDetailResponse = TPaymentConcept & {
  assignments: TPaymentConceptAssignment[]
  bankAccounts: TPaymentConceptBankAccount[]
}

export interface ICreatePaymentConceptOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPaymentConcept>>) => void
  onError?: (error: Error) => void
}

export interface IUpdatePaymentConceptOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPaymentConcept>>) => void
  onError?: (error: Error) => void
}

export interface IUpdatePaymentConceptVariables extends TPaymentConceptUpdate {
  conceptId: string
}

export interface IDeactivatePaymentConceptOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPaymentConcept>>) => void
  onError?: (error: Error) => void
}

export interface IDeactivatePaymentConceptVariables {
  conceptId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List (Paginated)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Detail (concept + assignments + bank accounts)
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentConceptDetail(options: IUsePaymentConceptDetailOptions) {
  const { companyId, conceptId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TConceptDetailResponse>>({
    path: `/${companyId}/me/payment-concepts/${conceptId}`,
    queryKey: paymentConceptKeys.detail(companyId, conceptId),
    enabled: enabled && !!companyId && !!conceptId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useCreatePaymentConcept(companyId: string, options?: ICreatePaymentConceptOptions) {
  return useApiMutation<TApiDataResponse<TPaymentConcept>, TPaymentConceptCreate>({
    path: `/${companyId}/me/payment-concepts`,
    method: 'POST',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentConceptKeys.all],
  })
}

export function useUpdatePaymentConcept(companyId: string, options?: IUpdatePaymentConceptOptions) {
  return useApiMutation<TApiDataResponse<TPaymentConcept>, IUpdatePaymentConceptVariables>({
    path: (variables) => `/${companyId}/me/payment-concepts/${variables.conceptId}`,
    method: 'PATCH',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentConceptKeys.all],
  })
}

export function useDeactivatePaymentConcept(companyId: string, options?: IDeactivatePaymentConceptOptions) {
  return useApiMutation<TApiDataResponse<TPaymentConcept>, IDeactivatePaymentConceptVariables>({
    path: (variables) => `/${companyId}/me/payment-concepts/${variables.conceptId}/deactivate`,
    method: 'PATCH',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentConceptKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getPaymentConceptDetail(
  companyId: string,
  conceptId: string
): Promise<TConceptDetailResponse> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TConceptDetailResponse>>(
    `/${companyId}/me/payment-concepts/${conceptId}`
  )
  return response.data.data
}
