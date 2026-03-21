import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TPayment } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const paymentFlowKeys = {
  all: ['payment-flow'] as const,
  payableQuotas: (unitId: string, conceptIds: string[]) =>
    [...paymentFlowKeys.all, 'payable-quotas', unitId, conceptIds.join(',')] as const,
  gatewayHealth: (gatewayType: string) =>
    [...paymentFlowKeys.all, 'gateway-health', gatewayType] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IPayableQuotaGroup {
  concept: {
    id: string
    name: string
    conceptType: string
    currencyId: string
    allowsPartialPayment: boolean
  }
  quotas: Array<{
    id: string
    unitId: string
    paymentConceptId: string
    periodYear: number
    periodMonth: number
    periodDescription: string | null
    baseAmount: string
    balance: string
    dueDate: string
    status: string
  }>
  bankAccounts: IPayableBankAccount[]
}

export interface IPayableBankAccount {
  id: string
  displayName: string
  bankName: string
  bankCode: string
  isBnc: boolean
  acceptedPaymentMethods: string[]
}

export interface IPayableQuotasResponse {
  groups: IPayableQuotaGroup[]
}

export interface IValidateSelectionInput {
  unitId: string
  quotaIds: string[]
  amounts: Record<string, string>
}

export interface IValidateSelectionResponse {
  validatedQuotas: Array<{
    quotaId: string
    paymentConceptId: string
    amount: string
    balance: string
  }>
  total: string
  currencyId: string
  commonBankAccounts: IPayableBankAccount[]
}

export interface IInitiatePaymentInput {
  unitId: string
  quotaIds: string[]
  amounts: Record<string, string>
  method: 'c2p' | 'vpos' | 'manual'
  paymentMethod: string
  paymentDate: string
  bankAccountId: string
  receiptNumber?: string
  receiptUrl?: string
  notes?: string
  c2pData?: {
    debtorBankCode: string
    debtorCellPhone: string
    debtorID: string
    token: string
  }
  vposData?: {
    cardType: number
    cardNumber: string
    expiration: number
    cvv: number
    cardHolderName: string
    cardHolderID: number
    accountType: number
  }
}

export interface IInitiatePaymentResponse {
  payment: TPayment
  status: string
  externalTransactionId?: string
  externalReference?: string
  bncErrorCode?: string
  bncErrorMessage?: string
}

export interface IGatewayHealthResponse {
  available: boolean
  message: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

const BASE_PATH = '/condominium/payment-flow'

/**
 * Fetches payable quotas for a unit, grouped by payment concept.
 */
export function usePayableQuotas(unitId: string, conceptIds: string[] = [], enabled = true) {
  return useApiQuery<TApiDataResponse<IPayableQuotasResponse>>(
    paymentFlowKeys.payableQuotas(unitId, conceptIds),
    async () => {
      const client = getHttpClient()
      const query = conceptIds.length > 0 ? `?conceptIds=${conceptIds.join(',')}` : ''
      return client.get(`${BASE_PATH}/payable-quotas/${unitId}${query}`)
    },
    { enabled: enabled && !!unitId },
  )
}

/**
 * Validates a quota selection before payment.
 */
export function useValidateQuotaSelection(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<IValidateSelectionResponse>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<IValidateSelectionResponse>, IValidateSelectionInput>(
    async (input) => {
      const client = getHttpClient()
      return client.post(`${BASE_PATH}/validate-selection`, input)
    },
    {
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    },
  )
}

/**
 * Initiates a payment (BNC C2P/VPOS or manual registration).
 */
export function useInitiatePayment(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<IInitiatePaymentResponse>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<IInitiatePaymentResponse>, IInitiatePaymentInput>(
    async (input) => {
      const client = getHttpClient()
      return client.post(`${BASE_PATH}/initiate`, input)
    },
    {
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    },
  )
}

/**
 * Checks gateway health/availability.
 * Refetches every 30 seconds when enabled.
 */
export function useGatewayHealth(gatewayType: string, enabled = true) {
  return useApiQuery<TApiDataResponse<IGatewayHealthResponse>>(
    paymentFlowKeys.gatewayHealth(gatewayType),
    async () => {
      const client = getHttpClient()
      return client.get(`${BASE_PATH}/gateway-health/${gatewayType}`)
    },
    {
      enabled: enabled && !!gatewayType,
      refetchInterval: 30_000,
    },
  )
}
