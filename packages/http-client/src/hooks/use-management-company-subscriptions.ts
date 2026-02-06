import { useQuery } from '@tanstack/react-query'
import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import { HttpError } from '../types/http'
import type {
  TManagementCompanySubscription,
  TManagementCompanySubscriptionCreate,
  TManagementCompanySubscriptionUpdate,
} from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const managementCompanySubscriptionKeys = {
  all: ['management-company-subscriptions'] as const,
  lists: () => [...managementCompanySubscriptionKeys.all, 'list'] as const,
  list: (companyId: string) => [...managementCompanySubscriptionKeys.lists(), companyId] as const,
  listPaginated: (companyId: string, query: ISubscriptionHistoryQuery) =>
    [...managementCompanySubscriptionKeys.lists(), 'paginated', companyId, query] as const,
  details: () => [...managementCompanySubscriptionKeys.all, 'detail'] as const,
  detail: (companyId: string) =>
    [...managementCompanySubscriptionKeys.details(), companyId] as const,
  active: (companyId: string) =>
    [...managementCompanySubscriptionKeys.all, 'active', companyId] as const,
  pricing: (companyId: string, query: IPricingQuery) =>
    [...managementCompanySubscriptionKeys.all, 'pricing', companyId, query] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseManagementCompanySubscriptionOptions {
  enabled?: boolean
}

export interface IUseManagementCompanySubscriptionsOptions {
  enabled?: boolean
}

export interface ISubscriptionHistoryQuery {
  page?: number
  limit?: number
  search?: string
  startDateFrom?: string
  startDateTo?: string
}

export interface IUseManagementCompanySubscriptionsPaginatedOptions {
  query: ISubscriptionHistoryQuery
  enabled?: boolean
}

export interface ICreateSubscriptionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TManagementCompanySubscription>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateSubscriptionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TManagementCompanySubscription>>) => void
  onError?: (error: Error) => void
}

export interface ICancelSubscriptionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<void>>) => void
  onError?: (error: Error) => void
}

export interface IRenewSubscriptionOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TManagementCompanySubscription>>) => void
  onError?: (error: Error) => void
}

export interface ICancelSubscriptionData {
  cancelledBy: string
  cancellationReason?: string
}

export interface IPricingQuery {
  rateId?: string
  condominiumRate?: number
  unitRate?: number
  userRate?: number
  billingCycle?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom'
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  // Subscription limits (for pricing based on max allowed, not current usage)
  condominiumCount?: number
  unitCount?: number
  userCount?: number
}

export interface IPricingCalculationResult {
  condominiumCount: number
  unitCount: number
  userCount: number
  condominiumRate: number
  unitRate: number
  userRate: number
  condominiumSubtotal: number
  unitSubtotal: number
  userSubtotal: number
  monthlyBasePrice: number // Price for 1 month (before multiplying by billing months)
  billingMonths: number // 1 for monthly, 12 for annual
  calculatedPrice: number // monthlyBasePrice × billingMonths
  discountType: 'percentage' | 'fixed' | null
  discountValue: number | null
  discountAmount: number
  annualDiscountPercentage: number
  annualDiscountAmount: number
  finalPrice: number
  // Rate info (from database)
  rateId: string | null
  rateName: string | null
  rateVersion: string | null
  rateDescription: string | null
  // Tier info (volume-based pricing)
  minCondominiums: number | null
  maxCondominiums: number | null
}

export interface IUseSubscriptionPricingOptions {
  query: IPricingQuery
  enabled?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Active Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch the active subscription for a management company
 * Returns null when no active subscription exists (404 is handled gracefully)
 */
export function useManagementCompanySubscription(
  companyId: string,
  options?: IUseManagementCompanySubscriptionOptions
) {
  const client = getHttpClient()

  return useQuery<TApiDataResponse<TManagementCompanySubscription> | null, HttpError>({
    queryKey: managementCompanySubscriptionKeys.active(companyId),
    queryFn: async () => {
      try {
        const response = await client.get<TApiDataResponse<TManagementCompanySubscription>>(
          `/management-companies/${companyId}/subscription`
        )
        return response.data
      } catch (error) {
        // Handle 404 as "no subscription" (return null instead of throwing)
        if (error instanceof HttpError && error.status === 404) {
          return null
        }
        // Re-throw other errors
        throw error
      }
    },
    enabled: options?.enabled !== false && !!companyId,
    // Don't retry - we handle 404 gracefully
    retry: false,
  })
}

/**
 * Standalone function to fetch active subscription
 */
export async function getManagementCompanySubscription(
  companyId: string
): Promise<TManagementCompanySubscription> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TManagementCompanySubscription>>(
    `/management-companies/${companyId}/subscription`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Subscription History
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch all subscriptions (history) for a management company
 * @deprecated Use useManagementCompanySubscriptionsPaginated instead
 */
export function useManagementCompanySubscriptions(
  companyId: string,
  options?: IUseManagementCompanySubscriptionsOptions
) {
  return useApiQuery<TApiDataResponse<TManagementCompanySubscription[]>>({
    path: `/management-companies/${companyId}/subscriptions`,
    queryKey: managementCompanySubscriptionKeys.list(companyId),
    config: {},
    enabled: options?.enabled !== false && !!companyId,
  })
}

/**
 * Hook to fetch paginated subscriptions (history) for a management company with filtering
 */
export function useManagementCompanySubscriptionsPaginated(
  companyId: string,
  options: IUseManagementCompanySubscriptionsPaginatedOptions
) {
  const { query, enabled = true } = options

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.startDateFrom) params.set('startDateFrom', query.startDateFrom)
  if (query.startDateTo) params.set('startDateTo', query.startDateTo)

  const queryString = params.toString()
  const path = `/management-companies/${companyId}/subscriptions${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TManagementCompanySubscription>>({
    path,
    queryKey: managementCompanySubscriptionKeys.listPaginated(companyId, query),
    config: {},
    enabled: enabled && !!companyId,
  })
}

/**
 * Standalone function to fetch subscriptions history
 * @deprecated Use getManagementCompanySubscriptionsPaginated instead
 */
export async function getManagementCompanySubscriptions(
  companyId: string
): Promise<TManagementCompanySubscription[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TManagementCompanySubscription[]>>(
    `/management-companies/${companyId}/subscriptions`
  )

  return response.data.data
}

/**
 * Standalone function to fetch paginated subscriptions history
 */
export async function getManagementCompanySubscriptionsPaginated(
  companyId: string,
  query: ISubscriptionHistoryQuery
): Promise<TApiPaginatedResponse<TManagementCompanySubscription>> {
  const client = getHttpClient()

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.startDateFrom) params.set('startDateFrom', query.startDateFrom)
  if (query.startDateTo) params.set('startDateTo', query.startDateTo)

  const queryString = params.toString()
  const path = `/management-companies/${companyId}/subscriptions${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiPaginatedResponse<TManagementCompanySubscription>>(path)

  return response.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to create a new subscription for a management company
 */
export function useCreateSubscription(companyId: string, options?: ICreateSubscriptionOptions) {
  return useApiMutation<
    TApiDataResponse<TManagementCompanySubscription>,
    TManagementCompanySubscriptionCreate
  >({
    path: `/management-companies/${companyId}/subscription`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanySubscriptionKeys.active(companyId),
      managementCompanySubscriptionKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to create a subscription
 */
export async function createSubscription(
  companyId: string,
  data: TManagementCompanySubscriptionCreate
): Promise<TManagementCompanySubscription> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TManagementCompanySubscription>>(
    `/management-companies/${companyId}/subscription`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to update a subscription
 */
export function useUpdateSubscription(companyId: string, options?: IUpdateSubscriptionOptions) {
  return useApiMutation<
    TApiDataResponse<TManagementCompanySubscription>,
    TManagementCompanySubscriptionUpdate
  >({
    path: `/management-companies/${companyId}/subscription`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanySubscriptionKeys.active(companyId),
      managementCompanySubscriptionKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to update a subscription
 */
export async function updateSubscription(
  companyId: string,
  data: TManagementCompanySubscriptionUpdate
): Promise<TManagementCompanySubscription> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TManagementCompanySubscription>>(
    `/management-companies/${companyId}/subscription`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Cancel Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to cancel a subscription
 */
export function useCancelSubscription(companyId: string, options?: ICancelSubscriptionOptions) {
  return useApiMutation<TApiDataResponse<void>, ICancelSubscriptionData>({
    path: `/management-companies/${companyId}/subscription`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanySubscriptionKeys.active(companyId),
      managementCompanySubscriptionKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to cancel a subscription
 */
export async function cancelSubscription(
  companyId: string,
  data: ICancelSubscriptionData
): Promise<void> {
  const client = getHttpClient()
  await client.delete<TApiDataResponse<void>>(
    `/management-companies/${companyId}/subscription`,
    data
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Renew Subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to renew a subscription
 */
export function useRenewSubscription(companyId: string, options?: IRenewSubscriptionOptions) {
  return useApiMutation<TApiDataResponse<TManagementCompanySubscription>, void>({
    path: `/management-companies/${companyId}/subscription/renew`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanySubscriptionKeys.active(companyId),
      managementCompanySubscriptionKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to renew a subscription
 */
export async function renewSubscription(
  companyId: string
): Promise<TManagementCompanySubscription> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TManagementCompanySubscription>>(
    `/management-companies/${companyId}/subscription/renew`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Pricing Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to calculate subscription pricing for a management company
 * Uses placeholderData to keep previous data while fetching new data (prevents UI flicker)
 */
export function useSubscriptionPricing(
  companyId: string,
  options: IUseSubscriptionPricingOptions
) {
  const { query, enabled = true } = options

  // Build query string
  const params = new URLSearchParams()
  if (query.rateId) params.set('rateId', query.rateId)
  if (query.condominiumRate !== undefined) params.set('condominiumRate', String(query.condominiumRate))
  if (query.unitRate !== undefined) params.set('unitRate', String(query.unitRate))
  if (query.userRate !== undefined) params.set('userRate', String(query.userRate))
  if (query.billingCycle) params.set('billingCycle', query.billingCycle)
  if (query.discountType) params.set('discountType', query.discountType)
  if (query.discountValue !== undefined) params.set('discountValue', String(query.discountValue))
  // Subscription limits
  if (query.condominiumCount !== undefined) params.set('condominiumCount', String(query.condominiumCount))
  if (query.unitCount !== undefined) params.set('unitCount', String(query.unitCount))
  if (query.userCount !== undefined) params.set('userCount', String(query.userCount))

  const queryString = params.toString()
  const path = `/management-companies/${companyId}/subscription/pricing${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiDataResponse<IPricingCalculationResult>>({
    path,
    queryKey: managementCompanySubscriptionKeys.pricing(companyId, query),
    config: {},
    enabled: enabled && !!companyId,
    // Keep previous data while fetching new data to prevent UI flicker
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Standalone function to calculate subscription pricing
 */
export async function getSubscriptionPricing(
  companyId: string,
  query: IPricingQuery = {}
): Promise<IPricingCalculationResult> {
  const client = getHttpClient()

  // Build query string
  const params = new URLSearchParams()
  if (query.rateId) params.set('rateId', query.rateId)
  if (query.condominiumRate !== undefined) params.set('condominiumRate', String(query.condominiumRate))
  if (query.unitRate !== undefined) params.set('unitRate', String(query.unitRate))
  if (query.userRate !== undefined) params.set('userRate', String(query.userRate))
  if (query.billingCycle) params.set('billingCycle', query.billingCycle)
  if (query.discountType) params.set('discountType', query.discountType)
  if (query.discountValue !== undefined) params.set('discountValue', String(query.discountValue))
  // Subscription limits
  if (query.condominiumCount !== undefined) params.set('condominiumCount', String(query.condominiumCount))
  if (query.unitCount !== undefined) params.set('unitCount', String(query.unitCount))
  if (query.userCount !== undefined) params.set('userCount', String(query.userCount))

  const queryString = params.toString()
  const path = `/management-companies/${companyId}/subscription/pricing${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiDataResponse<IPricingCalculationResult>>(path)

  return response.data.data
}
