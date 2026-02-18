import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TQuota, TQuotaCreate, TQuotaUpdate } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const quotaKeys = {
  all: ['quotas'] as const,
  lists: () => [...quotaKeys.all, 'list'] as const,
  list: (query: IQuotasQuery) => [...quotaKeys.lists(), query] as const,
  byUnit: (unitId: string) => [...quotaKeys.all, 'unit', unitId] as const,
  byUnitPaginated: (unitId: string, query: IQuotasByUnitQuery) =>
    [...quotaKeys.all, 'unit', unitId, 'paginated', query] as const,
  pendingByUnit: (unitId: string) => [...quotaKeys.all, 'unit', unitId, 'pending'] as const,
  byStatus: (status: string) => [...quotaKeys.all, 'status', status] as const,
  overdue: (date: string) => [...quotaKeys.all, 'overdue', date] as const,
  byPeriod: (year: number, month?: number) => [...quotaKeys.all, 'period', year, month] as const,
  details: () => [...quotaKeys.all, 'detail'] as const,
  detail: (id: string) => [...quotaKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IQuotasQuery {
  page?: number
  limit?: number
  status?: string
  unitId?: string
  periodYear?: number
  periodMonth?: number
}

export interface IUseQuotasOptions {
  query?: IQuotasQuery
  enabled?: boolean
}

export interface IQuotasByUnitQuery {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  status?: string
}

export interface IUseQuotaDetailOptions {
  enabled?: boolean
}

export interface ICreateQuotaOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TQuota>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateQuotaOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TQuota>>) => void
  onError?: (error: Error) => void
}

export interface IDeleteQuotaOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TQuota>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List All Quotas
// ─────────────────────────────────────────────────────────────────────────────

export function useQuotas(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TQuota[]>>({
    path: '/condominium/quotas',
    queryKey: quotaKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Quotas by Unit
// ─────────────────────────────────────────────────────────────────────────────

export function useQuotasByUnit(unitId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TQuota[]>>({
    path: `/condominium/quotas/unit/${unitId}`,
    queryKey: quotaKeys.byUnit(unitId),
    config: {},
    enabled: options?.enabled !== false && !!unitId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Quotas by Unit (Paginated)
// ─────────────────────────────────────────────────────────────────────────────

export function useQuotasByUnitPaginated(options: {
  query: IQuotasByUnitQuery & { unitId: string }
  enabled?: boolean
}) {
  const { query, enabled = true } = options
  const { unitId, ...filters } = query

  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.status) params.set('status', filters.status)

  const queryString = params.toString()
  const path = `/condominium/quotas/unit/${unitId}/paginated${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TQuota>>({
    path,
    queryKey: quotaKeys.byUnitPaginated(unitId, filters),
    config: {},
    enabled: enabled && !!unitId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Pending Quotas by Unit
// ─────────────────────────────────────────────────────────────────────────────

export function useQuotasPendingByUnit(unitId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TQuota[]>>({
    path: `/condominium/quotas/unit/${unitId}/pending`,
    queryKey: quotaKeys.pendingByUnit(unitId),
    config: {},
    enabled: options?.enabled !== false && !!unitId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Quotas by Status
// ─────────────────────────────────────────────────────────────────────────────

export function useQuotasByStatus(status: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TQuota[]>>({
    path: `/condominium/quotas/status/${status}`,
    queryKey: quotaKeys.byStatus(status),
    config: {},
    enabled: options?.enabled !== false && !!status,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Overdue Quotas
// ─────────────────────────────────────────────────────────────────────────────

export function useQuotasOverdue(date: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TQuota[]>>({
    path: `/condominium/quotas/overdue/${date}`,
    queryKey: quotaKeys.overdue(date),
    config: {},
    enabled: options?.enabled !== false && !!date,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Quotas by Period
// ─────────────────────────────────────────────────────────────────────────────

export function useQuotasByPeriod(year: number, month?: number, options?: { enabled?: boolean }) {
  const params = new URLSearchParams()
  params.set('year', String(year))
  if (month !== undefined) params.set('month', String(month))

  const queryString = params.toString()
  const path = `/condominium/quotas/period${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiDataResponse<TQuota[]>>({
    path,
    queryKey: quotaKeys.byPeriod(year, month),
    config: {},
    enabled: options?.enabled !== false && !!year,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Quota by ID
// ─────────────────────────────────────────────────────────────────────────────

export function useQuotaDetail(id: string, options?: IUseQuotaDetailOptions) {
  return useApiQuery<TApiDataResponse<TQuota>>({
    path: `/condominium/quotas/${id}`,
    queryKey: quotaKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Quota
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateQuota(options?: ICreateQuotaOptions) {
  return useApiMutation<TApiDataResponse<TQuota>, TQuotaCreate>({
    path: '/condominium/quotas',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [quotaKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Quota
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateQuota(id: string, options?: IUpdateQuotaOptions) {
  return useApiMutation<TApiDataResponse<TQuota>, TQuotaUpdate>({
    path: `/condominium/quotas/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [quotaKeys.all, quotaKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Delete/Cancel Quota
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteQuota(options?: IDeleteQuotaOptions) {
  return useApiMutation<TApiDataResponse<TQuota>, { id: string }>({
    path: (data) => `/condominium/quotas/${data.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [quotaKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getQuotas(): Promise<TQuota[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TQuota[]>>('/condominium/quotas')
  return response.data.data
}

export async function getQuotasByUnit(unitId: string): Promise<TQuota[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TQuota[]>>(`/condominium/quotas/unit/${unitId}`)
  return response.data.data
}

export async function getQuotasByUnitServer(
  token: string,
  unitId: string,
  condominiumId?: string,
  managementCompanyId?: string
): Promise<TQuota[]> {
  const client = getHttpClient()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (condominiumId) {
    headers['x-condominium-id'] = condominiumId
  }
  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }
  const response = await client.get<TApiDataResponse<TQuota[]>>(`/condominium/quotas/unit/${unitId}`, { headers })
  return response.data.data
}

export async function getQuotasPendingByUnit(unitId: string): Promise<TQuota[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TQuota[]>>(`/condominium/quotas/unit/${unitId}/pending`)
  return response.data.data
}

export async function getQuotasByStatus(status: string): Promise<TQuota[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TQuota[]>>(`/condominium/quotas/status/${status}`)
  return response.data.data
}

export async function getQuotasOverdue(date: string): Promise<TQuota[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TQuota[]>>(`/condominium/quotas/overdue/${date}`)
  return response.data.data
}

export async function getQuotasByPeriod(year: number, month?: number): Promise<TQuota[]> {
  const client = getHttpClient()
  const params = new URLSearchParams()
  params.set('year', String(year))
  if (month !== undefined) params.set('month', String(month))
  const queryString = params.toString()
  const path = `/condominium/quotas/period${queryString ? `?${queryString}` : ''}`
  const response = await client.get<TApiDataResponse<TQuota[]>>(path)
  return response.data.data
}

export async function getQuotaDetail(id: string): Promise<TQuota> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TQuota>>(`/condominium/quotas/${id}`)
  return response.data.data
}

export async function createQuota(data: TQuotaCreate): Promise<TQuota> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TQuota>>('/condominium/quotas', data)
  return response.data.data
}

export async function updateQuota(id: string, data: TQuotaUpdate): Promise<TQuota> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TQuota>>(`/condominium/quotas/${id}`, data)
  return response.data.data
}

export async function deleteQuota(id: string): Promise<TQuota> {
  const client = getHttpClient()
  const response = await client.delete<TApiDataResponse<TQuota>>(`/condominium/quotas/${id}`)
  return response.data.data
}
