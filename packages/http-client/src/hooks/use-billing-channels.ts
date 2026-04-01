import { useApiMutation, useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TBillingChannel, TChargeType } from '@packages/domain'

// ─── Types ───

export interface ICreateChargeTypeInput {
  name: string
  category: string
  isRecurring: boolean
  defaultAmount: string | null
  sortOrder: number
}

export interface ICreateBillingChannelInput {
  condominiumId: string
  buildingId?: string | null
  name: string
  channelType: 'receipt' | 'standalone'
  currencyId: string
  managedBy?: string | null
  distributionMethod: string
  frequency: string
  generationStrategy: string
  generationDay: number
  dueDay: number
  latePaymentType: string
  latePaymentValue?: string | null
  gracePeriodDays: number
  earlyPaymentType: string
  earlyPaymentValue?: string | null
  earlyPaymentDaysBefore: number
  interestType: string
  interestRate?: string | null
  interestGracePeriodDays: number
  maxInterestCapType: string
  maxInterestCapValue?: string | null
  allocationStrategy: string
  assemblyReference?: string | null
  effectiveFrom: string
  effectiveUntil?: string | null
  chargeTypes: ICreateChargeTypeInput[]
  bankAccountIds: string[]
}

export interface IChargeAmountInput {
  chargeTypeId: string
  amount: string
  description?: string
  expenseId?: string
}

export interface IGenerateInput {
  periodYear: number
  periodMonth: number
  chargeAmounts: IChargeAmountInput[]
  budgetId?: string
}

export interface IPreviewInput {
  chargeAmounts: Array<{ chargeTypeId: string; amount: string }>
}

export interface IUnitPreview {
  unitId: string
  unitNumber: string
  aliquotPercentage: string
  charges: Array<{
    chargeTypeName: string
    chargeTypeId: string
    category: string
    amount: string
  }>
  total: string
}

export interface IPreviewResult {
  unitPreviews: IUnitPreview[]
  grandTotal: string
  aliquotSum: string
}

export interface IGenerateResult {
  receipts: any[]
  totalGenerated: number
}

// ─── Query Keys ───

export const billingChannelKeys = {
  all: ['billing-channels'] as const,
  lists: () => [...billingChannelKeys.all, 'list'] as const,
  listByCondominium: (condoId: string) => [...billingChannelKeys.lists(), condoId] as const,
  detail: (id: string) => [...billingChannelKeys.all, 'detail', id] as const,
  chargeTypes: (id: string) => [...billingChannelKeys.all, 'charge-types', id] as const,
}

// ─── Hooks ───

export function useBillingChannels(condominiumId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TBillingChannel[]>>({
    path: `/billing/channels?condominiumId=${condominiumId}`,
    queryKey: billingChannelKeys.listByCondominium(condominiumId),
    config: {},
    enabled: options?.enabled !== false && !!condominiumId,
  })
}

export function useBillingChannelDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TBillingChannel>>({
    path: `/billing/channels/${id}`,
    queryKey: billingChannelKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

export function useBillingChannelChargeTypes(channelId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TChargeType[]>>({
    path: `/billing/channels/${channelId}/charge-types`,
    queryKey: billingChannelKeys.chargeTypes(channelId),
    config: {},
    enabled: options?.enabled !== false && !!channelId,
  })
}

export function useCreateBillingChannel(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TBillingChannel>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<TBillingChannel>, ICreateBillingChannelInput>({
    path: '/billing/channels',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [billingChannelKeys.all],
  })
}

export function usePreviewGeneration(channelId: string, options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<IPreviewResult>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<IPreviewResult>, IPreviewInput>({
    path: `/billing/channels/${channelId}/generate/preview`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

export function useGenerateChannelPeriod(channelId: string, options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<IGenerateResult>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<IGenerateResult>, IGenerateInput>({
    path: `/billing/channels/${channelId}/generate`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [billingChannelKeys.all, ['billing-receipts'], ['billing-charges']],
  })
}
