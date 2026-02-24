import { useApiQuery, useApiMutation } from './use-api-query'
import type {
  TServiceExecution,
  TServiceExecutionCreate,
  TServiceExecutionUpdate,
} from '@packages/domain'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const serviceExecutionKeys = {
  all: ['service-executions'] as const,
  byService: (companyId: string, serviceId: string) =>
    [...serviceExecutionKeys.all, 'by-service', companyId, serviceId] as const,
  paginated: (companyId: string, serviceId: string, query: object) =>
    [...serviceExecutionKeys.all, 'paginated', companyId, serviceId, query] as const,
  detail: (companyId: string, serviceId: string, executionId: string) =>
    [...serviceExecutionKeys.all, 'detail', companyId, serviceId, executionId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IServiceExecutionsQuery {
  page?: number
  limit?: number
  status?: 'draft' | 'confirmed'
  conceptId?: string
}

export interface IUseServiceExecutionsPaginatedOptions {
  companyId: string
  serviceId: string
  condominiumId?: string
  query?: IServiceExecutionsQuery
  enabled?: boolean
}

export interface IUseServiceExecutionDetailOptions {
  companyId: string
  serviceId: string
  executionId: string
  condominiumId?: string
  enabled?: boolean
}

export interface ICreateServiceExecutionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TServiceExecution>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateServiceExecutionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TServiceExecution>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateServiceExecutionVariables extends TServiceExecutionUpdate {
  executionId: string
}

export interface IDeleteServiceExecutionVariables {
  executionId: string
}

export interface IDeleteServiceExecutionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<{ id: string }>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List (Paginated)
// ─────────────────────────────────────────────────────────────────────────────

export function useServiceExecutionsPaginated(options: IUseServiceExecutionsPaginatedOptions) {
  const { companyId, serviceId, condominiumId, query = {}, enabled = true } = options

  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.status) params.set('status', query.status)
  if (query.conceptId) params.set('conceptId', query.conceptId)

  const queryString = params.toString()
  const path = `/${companyId}/me/condominium-services/${serviceId}/executions${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TServiceExecution>>({
    path,
    queryKey: serviceExecutionKeys.paginated(companyId, serviceId, query),
    enabled: enabled && !!companyId && !!serviceId,
    config: condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Detail
// ─────────────────────────────────────────────────────────────────────────────

export function useServiceExecutionDetail(options: IUseServiceExecutionDetailOptions) {
  const { companyId, serviceId, executionId, condominiumId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TServiceExecution>>({
    path: `/${companyId}/me/condominium-services/${serviceId}/executions/${executionId}`,
    queryKey: serviceExecutionKeys.detail(companyId, serviceId, executionId),
    enabled: enabled && !!companyId && !!serviceId && !!executionId,
    config: condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateServiceExecution(
  companyId: string,
  serviceId: string,
  condominiumId?: string,
  options?: ICreateServiceExecutionOptions
) {
  const config = condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined
  type TBody = Omit<TServiceExecutionCreate, 'serviceId' | 'condominiumId'>
  return useApiMutation<TApiDataResponse<TServiceExecution>, TBody>({
    path: `/${companyId}/me/condominium-services/${serviceId}/executions`,
    method: 'POST',
    config,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [serviceExecutionKeys.byService(companyId, serviceId)],
  })
}

export function useUpdateServiceExecution(
  companyId: string,
  serviceId: string,
  condominiumId?: string,
  options?: IUpdateServiceExecutionOptions
) {
  const config = condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined
  return useApiMutation<TApiDataResponse<TServiceExecution>, IUpdateServiceExecutionVariables>({
    path: (variables) =>
      `/${companyId}/me/condominium-services/${serviceId}/executions/${variables.executionId}`,
    method: 'PATCH',
    config,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [serviceExecutionKeys.byService(companyId, serviceId)],
  })
}

export function useDeleteServiceExecution(
  companyId: string,
  serviceId: string,
  condominiumId?: string,
  options?: IDeleteServiceExecutionOptions
) {
  const config = condominiumId ? { headers: { 'x-condominium-id': condominiumId } } : undefined
  return useApiMutation<TApiDataResponse<{ id: string }>, IDeleteServiceExecutionVariables>({
    path: (variables) =>
      `/${companyId}/me/condominium-services/${serviceId}/executions/${variables.executionId}`,
    method: 'DELETE',
    config,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [serviceExecutionKeys.byService(companyId, serviceId)],
  })
}
