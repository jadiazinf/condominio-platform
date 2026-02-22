import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TExchangeRate, TExchangeRateCreate } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const exchangeRateKeys = {
  all: ['exchange-rates'] as const,
  lists: () => [...exchangeRateKeys.all, 'list'] as const,
  list: (query: IExchangeRatesQuery) => [...exchangeRateKeys.lists(), query] as const,
  latest: () => [...exchangeRateKeys.all, 'latest'] as const,
  latestPair: (from: string, to: string) => [...exchangeRateKeys.latest(), from, to] as const,
  byDate: (date: string) => [...exchangeRateKeys.all, 'date', date] as const,
  details: () => [...exchangeRateKeys.all, 'detail'] as const,
  detail: (id: string) => [...exchangeRateKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IExchangeRatesQuery {
  page?: number
  limit?: number
  fromCurrencyId?: string
  toCurrencyId?: string
  dateFrom?: string
  dateTo?: string
}

export interface IUseExchangeRatesOptions {
  query?: IExchangeRatesQuery
  enabled?: boolean
}

export interface ICreateExchangeRateOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TExchangeRate>>) => void
  onError?: (error: Error) => void
}

export interface IDeleteExchangeRateOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TExchangeRate>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List All (Non-Paginated)
// ─────────────────────────────────────────────────────────────────────────────

export function useExchangeRates(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExchangeRate[]>>({
    path: '/platform/exchange-rates',
    queryKey: exchangeRateKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Paginated with Filters (History View)
// ─────────────────────────────────────────────────────────────────────────────

export function useExchangeRatesPaginated(options?: IUseExchangeRatesOptions) {
  const { query = {}, enabled = true } = options ?? {}

  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.fromCurrencyId) params.set('fromCurrencyId', query.fromCurrencyId)
  if (query.toCurrencyId) params.set('toCurrencyId', query.toCurrencyId)
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)

  const queryString = params.toString()
  const path = `/platform/exchange-rates/paginated${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TExchangeRate>>({
    path,
    queryKey: exchangeRateKeys.list(query),
    config: {},
    enabled,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Latest Rates (One Per Currency Pair)
// ─────────────────────────────────────────────────────────────────────────────

export function useLatestExchangeRates(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExchangeRate[]>>({
    path: '/platform/exchange-rates/latest',
    queryKey: exchangeRateKeys.latest(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Latest Rate for Specific Pair
// ─────────────────────────────────────────────────────────────────────────────

export function useLatestExchangeRate(
  fromCurrencyId: string,
  toCurrencyId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<TExchangeRate>>({
    path: `/platform/exchange-rates/latest/${fromCurrencyId}/${toCurrencyId}`,
    queryKey: exchangeRateKeys.latestPair(fromCurrencyId, toCurrencyId),
    config: {},
    enabled: options?.enabled !== false && !!fromCurrencyId && !!toCurrencyId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Rates by Date
// ─────────────────────────────────────────────────────────────────────────────

export function useExchangeRatesByDate(date: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExchangeRate[]>>({
    path: `/platform/exchange-rates/date/${date}`,
    queryKey: exchangeRateKeys.byDate(date),
    config: {},
    enabled: options?.enabled !== false && !!date,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Exchange Rate
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateExchangeRate(options?: ICreateExchangeRateOptions) {
  return useApiMutation<TApiDataResponse<TExchangeRate>, TExchangeRateCreate>({
    path: '/platform/exchange-rates',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [exchangeRateKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Delete Exchange Rate (Hard Delete)
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteExchangeRate(options?: IDeleteExchangeRateOptions) {
  return useApiMutation<TApiDataResponse<TExchangeRate>, { id: string }>({
    path: (data) => `/platform/exchange-rates/${data.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [exchangeRateKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Latest Rates (Any Authenticated User)
// ─────────────────────────────────────────────────────────────────────────────

export function useMyLatestExchangeRates(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExchangeRate[]>>({
    path: '/me/exchange-rates/latest',
    queryKey: [...exchangeRateKeys.all, 'my-latest'] as const,
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getLatestExchangeRates(): Promise<TExchangeRate[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExchangeRate[]>>('/platform/exchange-rates/latest')
  return response.data.data
}

export async function getExchangeRatesPaginated(
  query: IExchangeRatesQuery = {}
): Promise<TExchangeRate[]> {
  const client = getHttpClient()
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.fromCurrencyId) params.set('fromCurrencyId', query.fromCurrencyId)
  if (query.toCurrencyId) params.set('toCurrencyId', query.toCurrencyId)
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)
  const queryString = params.toString()
  const path = `/platform/exchange-rates/paginated${queryString ? `?${queryString}` : ''}`
  const response = await client.get<TApiDataResponse<TExchangeRate[]>>(path)
  return response.data.data
}
