import { useApiMutation, useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import { billingReceiptKeys } from './use-billing-receipts'
import { billingChargeKeys } from './use-billing-charges'
import { billingLedgerKeys } from './use-billing-ledger'

// ─── Query Keys ───

export const monthlyBillingKeys = {
  all: ['monthly-billing'] as const,
  concepts: (condominiumId: string) =>
    [...monthlyBillingKeys.all, 'concepts', condominiumId] as const,
  history: (condominiumId: string) =>
    [...monthlyBillingKeys.all, 'history', condominiumId] as const,
}

// ─── Types ───

export interface IChargeTypeOption {
  id: string
  name: string
  categoryId: string
  isActive: boolean
}

export interface IUnitChargePreview {
  chargeTypeName: string
  chargeTypeId: string
  category: string
  amount: string
}

export interface IUnitPreview {
  unitId: string
  unitNumber: string
  aliquotPercentage: string
  charges: IUnitChargePreview[]
  total: string
}

export interface IPreviewResult {
  unitPreviews: IUnitPreview[]
  grandTotal: string
  aliquotSum: string
}

export interface IPreviewInput {
  condominiumId: string
  buildingId?: string | null
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  chargeAmounts: Array<{ chargeTypeId: string; amount: string }>
}

export interface IGenerateInput {
  condominiumId: string
  buildingId?: string | null
  periodYear: number
  periodMonth: number
  dueDay: number
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  currencyId: string
  chargeAmounts: Array<{
    chargeTypeId: string
    amount: string
    description?: string
    expenseId?: string
  }>
  budgetId?: string
  parentReceiptId?: string
  unitId?: string
  assemblyMinuteId?: string
}

export interface IGenerateResult {
  receiptsCreated: number
  totalCharges: number
  warnings?: string[]
}

export interface IBillingHistoryItem {
  id: string
  receiptNumber: string
  periodYear: number
  periodMonth: number
  totalAmount: string
  status: string
  dueDate: string | null
  createdAt: string
}

// ─── Hooks ───

export function useBillingConcepts(
  condominiumId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<IChargeTypeOption[]>>({
    path: '/condominium/charge-types',
    queryKey: monthlyBillingKeys.concepts(condominiumId),
    config: {},
    enabled: options?.enabled !== false && !!condominiumId,
  })
}

export function useBillingHistory(
  condominiumId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<IBillingHistoryItem[]>>({
    path: `/billing/receipts?condominiumId=${condominiumId}`,
    queryKey: monthlyBillingKeys.history(condominiumId),
    config: {},
    enabled: options?.enabled !== false && !!condominiumId,
  })
}

export function usePreviewBilling(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<IPreviewResult>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<IPreviewResult>, IPreviewInput>({
    path: '/billing/receipt-generation/preview',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

export function useGenerateBilling(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<IGenerateResult>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<IGenerateResult>, FormData>({
    path: '/billing/receipt-generation/generate',
    method: 'POST',
    config: {
      headers: {}, // Don't set Content-Type — browser sets it with boundary for FormData
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      monthlyBillingKeys.all,
      billingReceiptKeys.all,
      billingChargeKeys.all,
      billingLedgerKeys.all,
    ],
  })
}
