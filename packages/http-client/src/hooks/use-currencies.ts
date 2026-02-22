import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TCurrency, TCurrencyCreate, TCurrencyUpdate } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const currencyKeys = {
  all: ['currencies'] as const,
  lists: () => [...currencyKeys.all, 'list'] as const,
  details: () => [...currencyKeys.all, 'detail'] as const,
  detail: (id: string) => [...currencyKeys.details(), id] as const,
  base: () => [...currencyKeys.all, 'base'] as const,
  byCode: (code: string) => [...currencyKeys.all, 'code', code] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseCurrenciesOptions {
  enabled?: boolean
}

export interface IUseCurrencyOptions {
  enabled?: boolean
}

export interface ICreateCurrencyOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TCurrency>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateCurrencyOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TCurrency>>) => void
  onError?: (error: Error) => void
}

export interface IDeleteCurrencyOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TCurrency>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Currencies
// ─────────────────────────────────────────────────────────────────────────────

export function useCurrencies(options?: IUseCurrenciesOptions) {
  return useApiQuery<TApiDataResponse<TCurrency[]>>({
    path: '/platform/currencies',
    queryKey: currencyKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Active Currencies (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────

export function useActiveCurrencies(options?: IUseCurrenciesOptions) {
  return useApiQuery<TApiDataResponse<TCurrency[]>>({
    path: '/me/currencies',
    queryKey: [...currencyKeys.all, 'active'] as const,
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Currency by ID
// ─────────────────────────────────────────────────────────────────────────────

export function useCurrency(id: string, options?: IUseCurrencyOptions) {
  return useApiQuery<TApiDataResponse<TCurrency>>({
    path: `/platform/currencies/${id}`,
    queryKey: currencyKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Base Currency
// ─────────────────────────────────────────────────────────────────────────────

export function useBaseCurrency(options?: IUseCurrencyOptions) {
  return useApiQuery<TApiDataResponse<TCurrency>>({
    path: '/platform/currencies/base',
    queryKey: currencyKeys.base(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Currency
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateCurrency(options?: ICreateCurrencyOptions) {
  return useApiMutation<TApiDataResponse<TCurrency>, TCurrencyCreate>({
    path: '/platform/currencies',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [currencyKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Currency
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateCurrency(id: string, options?: IUpdateCurrencyOptions) {
  return useApiMutation<TApiDataResponse<TCurrency>, TCurrencyUpdate>({
    path: `/platform/currencies/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [currencyKeys.all, currencyKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Delete Currency (Soft Delete)
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteCurrency(options?: IDeleteCurrencyOptions) {
  return useApiMutation<TApiDataResponse<TCurrency>, { id: string }>({
    path: (data) => `/platform/currencies/${data.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [currencyKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getCurrencies(): Promise<TCurrency[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TCurrency[]>>('/platform/currencies')
  return response.data.data
}

export async function getBaseCurrency(): Promise<TCurrency> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TCurrency>>('/platform/currencies/base')
  return response.data.data
}

export async function getCurrency(id: string): Promise<TCurrency> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TCurrency>>(`/platform/currencies/${id}`)
  return response.data.data
}
