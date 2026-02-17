import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type {
  TSubscriptionTermsConditions,
  TSubscriptionTermsConditionsCreate,
  TSubscriptionTermsConditionsUpdate,
  TPaginatedResponse,
} from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionTermsKeys = {
  all: ['subscription-terms'] as const,
  lists: () => [...subscriptionTermsKeys.all, 'list'] as const,
  details: () => [...subscriptionTermsKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionTermsKeys.details(), id] as const,
  active: () => [...subscriptionTermsKeys.all, 'active'] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ITermsListQuery {
  page?: number
  limit?: number
  isActive?: boolean
}

export interface IUseSubscriptionTermsListOptions {
  enabled?: boolean
  query?: ITermsListQuery
}

export interface IUseSubscriptionTermsDetailOptions {
  enabled?: boolean
}

export interface ICreateSubscriptionTermsOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSubscriptionTermsConditions>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateSubscriptionTermsOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSubscriptionTermsConditions>>) => void
  onError?: (error: Error) => void
}

export interface IDeactivateSubscriptionTermsOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSubscriptionTermsConditions>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Terms (Paginated)
// ─────────────────────────────────────────────────────────────────────────────

export function useSubscriptionTermsList(options?: IUseSubscriptionTermsListOptions) {
  const query = options?.query
  const params = new URLSearchParams()
  if (query?.page) params.set('page', String(query.page))
  if (query?.limit) params.set('limit', String(query.limit))
  if (query?.isActive !== undefined) params.set('isActive', String(query.isActive))
  const queryString = params.toString()
  const path = `/platform/subscription-terms${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TPaginatedResponse<TSubscriptionTermsConditions>>({
    path,
    queryKey: [...subscriptionTermsKeys.lists(), query ?? {}],
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Terms by ID
// ─────────────────────────────────────────────────────────────────────────────

export function useSubscriptionTermsDetail(id: string, options?: IUseSubscriptionTermsDetailOptions) {
  return useApiQuery<TApiDataResponse<TSubscriptionTermsConditions>>({
    path: `/platform/subscription-terms/${id}`,
    queryKey: subscriptionTermsKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Terms
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateSubscriptionTerms(options?: ICreateSubscriptionTermsOptions) {
  return useApiMutation<TApiDataResponse<TSubscriptionTermsConditions>, TSubscriptionTermsConditionsCreate>({
    path: '/platform/subscription-terms',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [subscriptionTermsKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Terms
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateSubscriptionTerms(id: string, options?: IUpdateSubscriptionTermsOptions) {
  return useApiMutation<TApiDataResponse<TSubscriptionTermsConditions>, TSubscriptionTermsConditionsUpdate>({
    path: `/platform/subscription-terms/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [subscriptionTermsKeys.all, subscriptionTermsKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Deactivate Terms
// ─────────────────────────────────────────────────────────────────────────────

export function useDeactivateSubscriptionTerms(options?: IDeactivateSubscriptionTermsOptions) {
  return useApiMutation<TApiDataResponse<TSubscriptionTermsConditions>, { id: string }>({
    path: (data) => `/platform/subscription-terms/${data.id}/deactivate`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [subscriptionTermsKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Active Terms (Public)
// ─────────────────────────────────────────────────────────────────────────────

export function useActiveSubscriptionTerms(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TSubscriptionTermsConditions>>({
    path: '/platform/subscription-terms/active',
    queryKey: subscriptionTermsKeys.active(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getSubscriptionTermsList(query?: ITermsListQuery): Promise<TPaginatedResponse<TSubscriptionTermsConditions>> {
  const client = getHttpClient()
  const params = new URLSearchParams()
  if (query?.page) params.set('page', String(query.page))
  if (query?.limit) params.set('limit', String(query.limit))
  if (query?.isActive !== undefined) params.set('isActive', String(query.isActive))
  const queryString = params.toString()
  const path = `/platform/subscription-terms${queryString ? `?${queryString}` : ''}`
  const response = await client.get<TPaginatedResponse<TSubscriptionTermsConditions>>(path)
  return response.data
}

export async function getSubscriptionTermsDetail(id: string): Promise<TSubscriptionTermsConditions> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TSubscriptionTermsConditions>>(`/platform/subscription-terms/${id}`)
  return response.data.data
}
