import { useApiQuery, useApiMutation } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
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
    currencyCode: string
    currencySymbol: string
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
  accountHolderName: string
  accountNumber: string
  accountType: string
  identityDocType: string
  identityDocNumber: string
  phoneNumber: string | null
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
  senderPhone?: string
  senderBankCode?: string
  senderDocument?: string
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
  const query = conceptIds.length > 0 ? `?conceptIds=${conceptIds.join(',')}` : ''
  return useApiQuery<TApiDataResponse<IPayableQuotasResponse>>({
    queryKey: paymentFlowKeys.payableQuotas(unitId, conceptIds),
    path: `${BASE_PATH}/payable-quotas/${unitId}${query}`,
    enabled: enabled && !!unitId,
  })
}

/**
 * Validates a quota selection before payment.
 */
export function useValidateQuotaSelection() {
  return useApiMutation<TApiDataResponse<IValidateSelectionResponse>, IValidateSelectionInput>({
    path: `${BASE_PATH}/validate-selection`,
    method: 'POST',
  })
}

/**
 * Initiates a payment (BNC C2P/VPOS or manual registration).
 */
export function useInitiatePayment() {
  return useApiMutation<TApiDataResponse<IInitiatePaymentResponse>, IInitiatePaymentInput>({
    path: `${BASE_PATH}/initiate`,
    method: 'POST',
  })
}

/**
 * Checks gateway health/availability.
 * Refetches every 30 seconds when enabled.
 */
export function useGatewayHealth(gatewayType: string, enabled = true) {
  return useApiQuery<TApiDataResponse<IGatewayHealthResponse>>({
    queryKey: paymentFlowKeys.gatewayHealth(gatewayType),
    path: `${BASE_PATH}/gateway-health/${gatewayType}`,
    enabled: enabled && !!gatewayType,
    refetchInterval: 30_000,
  })
}
