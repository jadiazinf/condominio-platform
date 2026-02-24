import { useApiQuery, useApiMutation } from './use-api-query'
import type {
  TCondominiumService,
  TCondominiumServiceCreate,
  TCondominiumServiceUpdate,
  TCondominiumServicesQuery,
} from '@packages/domain'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const condominiumServiceKeys = {
  all: ['condominium-services'] as const,
  paginated: (companyId: string, query: TCondominiumServicesQuery) =>
    [...condominiumServiceKeys.all, 'paginated', companyId, query] as const,
  detail: (companyId: string, serviceId: string) =>
    [...condominiumServiceKeys.all, 'detail', companyId, serviceId] as const,
  byCondominium: (companyId: string) =>
    [...condominiumServiceKeys.all, 'by-condominium', companyId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseCondominiumServicesPaginatedOptions {
  companyId: string
  condominiumId?: string
  query: TCondominiumServicesQuery
  enabled?: boolean
}

export interface IUseCondominiumServiceDetailOptions {
  companyId: string
  condominiumId?: string
  serviceId: string
  enabled?: boolean
}

export interface ICreateCondominiumServiceOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TCondominiumService>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateCondominiumServiceOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TCondominiumService>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateCondominiumServiceVariables extends TCondominiumServiceUpdate {
  serviceId: string
}

export interface IDeactivateCondominiumServiceVariables {
  serviceId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List (Paginated)
// ─────────────────────────────────────────────────────────────────────────────

export function useCondominiumServicesPaginated(
  options: IUseCondominiumServicesPaginatedOptions
) {
  const { companyId, condominiumId, query, enabled = true } = options

  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.providerType) params.set('providerType', query.providerType)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/${companyId}/me/condominium-services${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TCondominiumService>>({
    path,
    queryKey: condominiumServiceKeys.paginated(companyId, query),
    enabled: enabled && !!companyId,
    config: condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Detail
// ─────────────────────────────────────────────────────────────────────────────

export function useCondominiumServiceDetail(options: IUseCondominiumServiceDetailOptions) {
  const { companyId, condominiumId, serviceId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TCondominiumService>>({
    path: `/${companyId}/me/condominium-services/${serviceId}`,
    queryKey: condominiumServiceKeys.detail(companyId, serviceId),
    enabled: enabled && !!companyId && !!serviceId,
    config: condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateCondominiumService(companyId: string, condominiumId?: string, options?: ICreateCondominiumServiceOptions) {
  const config = condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined
  return useApiMutation<TApiDataResponse<TCondominiumService>, TCondominiumServiceCreate>({
    path: `/${companyId}/me/condominium-services`,
    method: 'POST',
    config,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [condominiumServiceKeys.all],
  })
}

export function useUpdateCondominiumService(companyId: string, condominiumId?: string, options?: IUpdateCondominiumServiceOptions) {
  const config = condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined
  return useApiMutation<TApiDataResponse<TCondominiumService>, IUpdateCondominiumServiceVariables>({
    path: (variables) => `/${companyId}/me/condominium-services/${variables.serviceId}`,
    method: 'PATCH',
    config,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [condominiumServiceKeys.all],
  })
}

export function useDeactivateCondominiumService(companyId: string, condominiumId?: string) {
  const config = condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined
  return useApiMutation<TApiDataResponse<TCondominiumService>, IDeactivateCondominiumServiceVariables>({
    path: (variables) => `/${companyId}/me/condominium-services/${variables.serviceId}/deactivate`,
    method: 'PATCH',
    config,
    invalidateKeys: [condominiumServiceKeys.all],
  })
}
