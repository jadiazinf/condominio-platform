import { useApiQuery, useApiMutation } from './use-api-query'
import type { TPaymentConceptBankAccount } from '@packages/domain'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import { paymentConceptKeys } from './use-payment-concepts'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const paymentConceptBankAccountKeys = {
  all: ['payment-concept-bank-accounts'] as const,
  byConceptId: (companyId: string, conceptId: string) =>
    [...paymentConceptBankAccountKeys.all, 'by-concept', companyId, conceptId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUsePaymentConceptBankAccountsOptions {
  companyId: string
  conceptId: string
  enabled?: boolean
}

export interface ILinkBankAccountVariables {
  conceptId: string
  bankAccountId: string
}

export interface ILinkBankAccountOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPaymentConceptBankAccount>>) => void
  onError?: (error: Error) => void
}

export interface IUnlinkBankAccountVariables {
  bankAccountId: string
}

export interface IUnlinkBankAccountOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<{ success: boolean }>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentConceptBankAccounts(options: IUsePaymentConceptBankAccountsOptions) {
  const { companyId, conceptId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TPaymentConceptBankAccount[]>>({
    path: `/${companyId}/me/payment-concepts/${conceptId}/bank-accounts`,
    queryKey: paymentConceptBankAccountKeys.byConceptId(companyId, conceptId),
    enabled: enabled && !!companyId && !!conceptId,
  })
}

export function useLinkBankAccount(
  companyId: string,
  options?: ILinkBankAccountOptions
) {
  return useApiMutation<TApiDataResponse<TPaymentConceptBankAccount>, ILinkBankAccountVariables>({
    path: (variables) =>
      `/${companyId}/me/payment-concepts/${variables.conceptId}/bank-accounts`,
    method: 'POST',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentConceptBankAccountKeys.all, paymentConceptKeys.all],
  })
}

export function useUnlinkBankAccount(
  companyId: string,
  conceptId: string,
  options?: IUnlinkBankAccountOptions
) {
  return useApiMutation<TApiDataResponse<{ success: boolean }>, IUnlinkBankAccountVariables>({
    path: (variables) =>
      `/${companyId}/me/payment-concepts/${conceptId}/bank-accounts/${variables.bankAccountId}`,
    method: 'DELETE',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentConceptBankAccountKeys.all, paymentConceptKeys.all],
  })
}
