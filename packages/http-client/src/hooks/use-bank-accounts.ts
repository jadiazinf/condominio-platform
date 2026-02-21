import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TBankAccount, TBankAccountCreate, TBankAccountsQuery } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const bankAccountKeys = {
  all: ['bank-accounts'] as const,
  myCompanyPaginated: (companyId: string, query: TBankAccountsQuery) =>
    [...bankAccountKeys.all, 'my-company-paginated', companyId, query] as const,
  detail: (bankAccountId: string) =>
    [...bankAccountKeys.all, 'detail', bankAccountId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseMyCompanyBankAccountsPaginatedOptions {
  companyId: string
  query: TBankAccountsQuery
  enabled?: boolean
}

export interface IUseMyCompanyBankAccountDetailOptions {
  bankAccountId: string
  companyId: string
  enabled?: boolean
}

export interface ICreateBankAccountOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TBankAccount>>) => void
  onError?: (error: Error) => void
}

export interface IDeactivateBankAccountOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TBankAccount>>) => void
  onError?: (error: Error) => void
}

export interface IDeactivateBankAccountVariables {
  bankAccountId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Bank Accounts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch bank accounts of the authenticated user's management company (paginated)
 */
export function useMyCompanyBankAccountsPaginated(
  options: IUseMyCompanyBankAccountsPaginatedOptions
) {
  const { companyId, query, enabled = true } = options

  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.accountCategory) params.set('accountCategory', query.accountCategory)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
  if (query.condominiumId) params.set('condominiumId', query.condominiumId)

  const queryString = params.toString()
  const path = `/${companyId}/me/bank-accounts${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TBankAccount>>({
    path,
    queryKey: bankAccountKeys.myCompanyPaginated(companyId, query),
    enabled: enabled && !!companyId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Bank Account Detail
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch a single bank account detail
 */
export function useMyCompanyBankAccountDetail(
  options: IUseMyCompanyBankAccountDetailOptions
) {
  const { bankAccountId, companyId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TBankAccount>>({
    path: `/${companyId}/me/bank-accounts/${bankAccountId}`,
    queryKey: bankAccountKeys.detail(bankAccountId),
    enabled: enabled && !!companyId && !!bankAccountId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Bank Account
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to create a new bank account
 */
export function useCreateBankAccount(companyId: string, options?: ICreateBankAccountOptions) {
  return useApiMutation<TApiDataResponse<TBankAccount>, TBankAccountCreate>({
    path: `/${companyId}/me/bank-accounts`,
    method: 'POST',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [bankAccountKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Deactivate Bank Account
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to deactivate a bank account
 */
export function useDeactivateBankAccount(companyId: string, options?: IDeactivateBankAccountOptions) {
  return useApiMutation<TApiDataResponse<TBankAccount>, IDeactivateBankAccountVariables>({
    path: (variables) => `/${companyId}/me/bank-accounts/${variables.bankAccountId}/deactivate`,
    method: 'PATCH',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [bankAccountKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standalone function to fetch bank accounts with pagination
 */
export async function getMyCompanyBankAccountsPaginated(
  companyId: string,
  query: TBankAccountsQuery
): Promise<TApiPaginatedResponse<TBankAccount>> {
  const client = getHttpClient()

  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.accountCategory) params.set('accountCategory', query.accountCategory)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
  if (query.condominiumId) params.set('condominiumId', query.condominiumId)

  const queryString = params.toString()
  const path = `/${companyId}/me/bank-accounts${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiPaginatedResponse<TBankAccount>>(path)
  return response.data
}

/**
 * Standalone function to fetch a single bank account detail
 */
export async function getMyCompanyBankAccountDetail(
  companyId: string,
  bankAccountId: string
): Promise<TBankAccount> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TBankAccount>>(
    `/${companyId}/me/bank-accounts/${bankAccountId}`
  )
  return response.data.data
}
