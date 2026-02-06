import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type {
  TSubscriptionRate,
  TSubscriptionRateCreate,
  TSubscriptionRateUpdate,
} from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionRateKeys = {
  all: ['subscription-rates'] as const,
  lists: () => [...subscriptionRateKeys.all, 'list'] as const,
  list: (query: IRatesQuery) => [...subscriptionRateKeys.lists(), query] as const,
  details: () => [...subscriptionRateKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionRateKeys.details(), id] as const,
  active: () => [...subscriptionRateKeys.all, 'active'] as const,
  version: (version: string) => [...subscriptionRateKeys.all, 'version', version] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IRatesQuery {
  page?: number
  limit?: number
  isActive?: boolean
}

export interface IUseActiveSubscriptionRateOptions {
  enabled?: boolean
}

export interface IUseSubscriptionRatesOptions {
  query?: IRatesQuery
  enabled?: boolean
}

export interface IUseSubscriptionRateOptions {
  enabled?: boolean
}

export interface ICreateSubscriptionRateOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSubscriptionRate>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateSubscriptionRateOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSubscriptionRate>>) => void
  onError?: (error: Error) => void
}

export interface IActivateSubscriptionRateOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSubscriptionRate>>) => void
  onError?: (error: Error) => void
}

export interface IDeactivateSubscriptionRateOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSubscriptionRate>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Active Rate (Public)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch the active subscription rate
 */
export function useActiveSubscriptionRate(options?: IUseActiveSubscriptionRateOptions) {
  return useApiQuery<TApiDataResponse<TSubscriptionRate>>({
    path: '/subscription-rates/active',
    queryKey: subscriptionRateKeys.active(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

/**
 * Standalone function to fetch active subscription rate
 */
export async function getActiveSubscriptionRate(): Promise<TSubscriptionRate> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TSubscriptionRate>>(
    '/subscription-rates/active'
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Rate by Version
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch a subscription rate by version
 */
export function useSubscriptionRateByVersion(
  version: string,
  options?: IUseSubscriptionRateOptions
) {
  return useApiQuery<TApiDataResponse<TSubscriptionRate>>({
    path: `/subscription-rates/version/${version}`,
    queryKey: subscriptionRateKeys.version(version),
    config: {},
    enabled: options?.enabled !== false && !!version,
  })
}

/**
 * Standalone function to fetch subscription rate by version
 */
export async function getSubscriptionRateByVersion(version: string): Promise<TSubscriptionRate> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TSubscriptionRate>>(
    `/subscription-rates/version/${version}`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Rate by ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch a subscription rate by ID
 */
export function useSubscriptionRate(id: string, options?: IUseSubscriptionRateOptions) {
  return useApiQuery<TApiDataResponse<TSubscriptionRate>>({
    path: `/subscription-rates/${id}`,
    queryKey: subscriptionRateKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

/**
 * Standalone function to fetch subscription rate by ID
 */
export async function getSubscriptionRate(id: string): Promise<TSubscriptionRate> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TSubscriptionRate>>(
    `/subscription-rates/${id}`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Rates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch paginated subscription rates
 */
export function useSubscriptionRates(options?: IUseSubscriptionRatesOptions) {
  const { query = {}, enabled = true } = options ?? {}

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/subscription-rates${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TSubscriptionRate>>({
    path,
    queryKey: subscriptionRateKeys.list(query),
    config: {},
    enabled,
  })
}

/**
 * Standalone function to fetch paginated subscription rates
 */
export async function getSubscriptionRates(
  query: IRatesQuery = {}
): Promise<TApiPaginatedResponse<TSubscriptionRate>> {
  const client = getHttpClient()

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/subscription-rates${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiPaginatedResponse<TSubscriptionRate>>(path)

  return response.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Rate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to create a new subscription rate
 */
export function useCreateSubscriptionRate(options?: ICreateSubscriptionRateOptions) {
  return useApiMutation<TApiDataResponse<TSubscriptionRate>, TSubscriptionRateCreate>({
    path: '/subscription-rates',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [subscriptionRateKeys.all],
  })
}

/**
 * Standalone function to create a subscription rate
 */
export async function createSubscriptionRate(
  data: TSubscriptionRateCreate
): Promise<TSubscriptionRate> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TSubscriptionRate>>(
    '/subscription-rates',
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Rate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to update a subscription rate
 */
export function useUpdateSubscriptionRate(
  id: string,
  options?: IUpdateSubscriptionRateOptions
) {
  return useApiMutation<TApiDataResponse<TSubscriptionRate>, TSubscriptionRateUpdate>({
    path: `/subscription-rates/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      subscriptionRateKeys.all,
      subscriptionRateKeys.detail(id),
    ],
  })
}

/**
 * Standalone function to update a subscription rate
 */
export async function updateSubscriptionRate(
  id: string,
  data: TSubscriptionRateUpdate
): Promise<TSubscriptionRate> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TSubscriptionRate>>(
    `/subscription-rates/${id}`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Activate Rate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to activate a subscription rate (deactivates all other rates)
 */
export function useActivateSubscriptionRate(options?: IActivateSubscriptionRateOptions) {
  return useApiMutation<TApiDataResponse<TSubscriptionRate>, { id: string }>({
    path: (data) => `/subscription-rates/${data.id}/activate`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [subscriptionRateKeys.all],
  })
}

/**
 * Standalone function to activate a subscription rate
 */
export async function activateSubscriptionRate(id: string): Promise<TSubscriptionRate> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TSubscriptionRate>>(
    `/subscription-rates/${id}/activate`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Deactivate Rate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to deactivate a subscription rate
 */
export function useDeactivateSubscriptionRate(options?: IDeactivateSubscriptionRateOptions) {
  return useApiMutation<TApiDataResponse<TSubscriptionRate>, { id: string }>({
    path: (data) => `/subscription-rates/${data.id}/deactivate`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [subscriptionRateKeys.all],
  })
}

/**
 * Standalone function to deactivate a subscription rate
 */
export async function deactivateSubscriptionRate(id: string): Promise<TSubscriptionRate> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TSubscriptionRate>>(
    `/subscription-rates/${id}/deactivate`
  )

  return response.data.data
}
