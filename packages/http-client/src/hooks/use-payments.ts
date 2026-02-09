import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TPayment, TPaymentCreate, TPaymentUpdate } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (query: IPaymentsQuery) => [...paymentKeys.lists(), query] as const,
  pendingVerification: () => [...paymentKeys.all, 'pending-verification'] as const,
  byNumber: (paymentNumber: string) => [...paymentKeys.all, 'number', paymentNumber] as const,
  byUser: (userId: string) => [...paymentKeys.all, 'user', userId] as const,
  byUnit: (unitId: string) => [...paymentKeys.all, 'unit', unitId] as const,
  byStatus: (status: string) => [...paymentKeys.all, 'status', status] as const,
  byDateRange: (startDate: string, endDate: string) =>
    [...paymentKeys.all, 'date-range', startDate, endDate] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IPaymentsQuery {
  page?: number
  limit?: number
  status?: string
  userId?: string
  unitId?: string
  startDate?: string
  endDate?: string
}

export interface IUsePaymentsOptions {
  query?: IPaymentsQuery
  enabled?: boolean
}

export interface IUsePaymentDetailOptions {
  enabled?: boolean
}

export interface ICreatePaymentOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPayment>>) => void
  onError?: (error: Error) => void
}

export interface IReportPaymentOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPayment>>) => void
  onError?: (error: Error) => void
}

export interface IVerifyPaymentOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPayment>>) => void
  onError?: (error: Error) => void
}

export interface IRejectPaymentOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPayment>>) => void
  onError?: (error: Error) => void
}

export interface IUpdatePaymentOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPayment>>) => void
  onError?: (error: Error) => void
}

export interface IDeletePaymentOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPayment>>) => void
  onError?: (error: Error) => void
}

export interface IVerifyPaymentData {
  notes?: string
}

export interface IRejectPaymentData {
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List All Payments
// ─────────────────────────────────────────────────────────────────────────────

export function usePayments(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPayment[]>>({
    path: '/condominium/payments',
    queryKey: paymentKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Payments (Paginated)
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentsPaginated(options?: IUsePaymentsOptions) {
  const { query = {}, enabled = true } = options ?? {}

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.status) params.set('status', query.status)

  const queryString = params.toString()
  const path = `/condominium/payments${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TPayment>>({
    path,
    queryKey: paymentKeys.list(query),
    config: {},
    enabled,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Payments Pending Verification
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentsPendingVerification(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPayment[]>>({
    path: '/condominium/payments/pending-verification',
    queryKey: paymentKeys.pendingVerification(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Payment by Number
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentByNumber(paymentNumber: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPayment>>({
    path: `/condominium/payments/number/${paymentNumber}`,
    queryKey: paymentKeys.byNumber(paymentNumber),
    config: {},
    enabled: options?.enabled !== false && !!paymentNumber,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Payments by User
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentsByUser(userId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPayment[]>>({
    path: `/condominium/payments/user/${userId}`,
    queryKey: paymentKeys.byUser(userId),
    config: {},
    enabled: options?.enabled !== false && !!userId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Payments by Unit
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentsByUnit(unitId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPayment[]>>({
    path: `/condominium/payments/unit/${unitId}`,
    queryKey: paymentKeys.byUnit(unitId),
    config: {},
    enabled: options?.enabled !== false && !!unitId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Payments by Status
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentsByStatus(status: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TPayment[]>>({
    path: `/condominium/payments/status/${status}`,
    queryKey: paymentKeys.byStatus(status),
    config: {},
    enabled: options?.enabled !== false && !!status,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Payments by Date Range
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentsByDateRange(
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean }
) {
  const params = new URLSearchParams()
  params.set('startDate', startDate)
  params.set('endDate', endDate)

  const queryString = params.toString()
  const path = `/condominium/payments/date-range${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiDataResponse<TPayment[]>>({
    path,
    queryKey: paymentKeys.byDateRange(startDate, endDate),
    config: {},
    enabled: options?.enabled !== false && !!startDate && !!endDate,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Payment by ID
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentDetail(id: string, options?: IUsePaymentDetailOptions) {
  return useApiQuery<TApiDataResponse<TPayment>>({
    path: `/condominium/payments/${id}`,
    queryKey: paymentKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Payment
// ─────────────────────────────────────────────────────────────────────────────

export function useCreatePayment(options?: ICreatePaymentOptions) {
  return useApiMutation<TApiDataResponse<TPayment>, TPaymentCreate>({
    path: '/condominium/payments',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Report Payment (Tenant Reports)
// ─────────────────────────────────────────────────────────────────────────────

export function useReportPayment(options?: IReportPaymentOptions) {
  return useApiMutation<TApiDataResponse<TPayment>, TPaymentCreate>({
    path: '/condominium/payments/report',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Verify Payment (Admin Action)
// ─────────────────────────────────────────────────────────────────────────────

export function useVerifyPayment(id: string, options?: IVerifyPaymentOptions) {
  return useApiMutation<TApiDataResponse<TPayment>, IVerifyPaymentData>({
    path: `/condominium/payments/${id}/verify`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentKeys.all, paymentKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Reject Payment (Admin Action)
// ─────────────────────────────────────────────────────────────────────────────

export function useRejectPayment(id: string, options?: IRejectPaymentOptions) {
  return useApiMutation<TApiDataResponse<TPayment>, IRejectPaymentData>({
    path: `/condominium/payments/${id}/reject`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentKeys.all, paymentKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Payment
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdatePayment(id: string, options?: IUpdatePaymentOptions) {
  return useApiMutation<TApiDataResponse<TPayment>, TPaymentUpdate>({
    path: `/condominium/payments/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentKeys.all, paymentKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Delete Payment
// ─────────────────────────────────────────────────────────────────────────────

export function useDeletePayment(options?: IDeletePaymentOptions) {
  return useApiMutation<TApiDataResponse<TPayment>, { id: string }>({
    path: (data) => `/condominium/payments/${data.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getPayments(): Promise<TPayment[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPayment[]>>('/condominium/payments')
  return response.data.data
}

export async function getPaymentsPendingVerification(): Promise<TPayment[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPayment[]>>('/condominium/payments/pending-verification')
  return response.data.data
}

export async function getPaymentByNumber(paymentNumber: string): Promise<TPayment> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPayment>>(
    `/condominium/payments/number/${paymentNumber}`
  )
  return response.data.data
}

export async function getPaymentsByUser(userId: string): Promise<TPayment[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPayment[]>>(`/condominium/payments/user/${userId}`)
  return response.data.data
}

export async function getPaymentsByUnit(unitId: string): Promise<TPayment[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPayment[]>>(`/condominium/payments/unit/${unitId}`)
  return response.data.data
}

export async function getPaymentsByStatus(status: string): Promise<TPayment[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPayment[]>>(`/condominium/payments/status/${status}`)
  return response.data.data
}

export async function getPaymentsByDateRange(
  startDate: string,
  endDate: string
): Promise<TPayment[]> {
  const client = getHttpClient()
  const params = new URLSearchParams()
  params.set('startDate', startDate)
  params.set('endDate', endDate)
  const queryString = params.toString()
  const path = `/condominium/payments/date-range${queryString ? `?${queryString}` : ''}`
  const response = await client.get<TApiDataResponse<TPayment[]>>(path)
  return response.data.data
}

export async function getPaymentDetail(id: string): Promise<TPayment> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TPayment>>(`/condominium/payments/${id}`)
  return response.data.data
}

export async function createPayment(data: TPaymentCreate): Promise<TPayment> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TPayment>>('/condominium/payments', data)
  return response.data.data
}

export async function reportPayment(data: TPaymentCreate): Promise<TPayment> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TPayment>>('/condominium/payments/report', data)
  return response.data.data
}

export async function verifyPayment(id: string, data?: IVerifyPaymentData): Promise<TPayment> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TPayment>>(
    `/condominium/payments/${id}/verify`,
    data ?? {}
  )
  return response.data.data
}

export async function rejectPayment(id: string, data?: IRejectPaymentData): Promise<TPayment> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TPayment>>(
    `/condominium/payments/${id}/reject`,
    data ?? {}
  )
  return response.data.data
}

export async function updatePayment(id: string, data: TPaymentUpdate): Promise<TPayment> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TPayment>>(`/condominium/payments/${id}`, data)
  return response.data.data
}

export async function deletePayment(id: string): Promise<TPayment> {
  const client = getHttpClient()
  const response = await client.delete<TApiDataResponse<TPayment>>(`/condominium/payments/${id}`)
  return response.data.data
}
