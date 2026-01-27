import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TSubscriptionInvoice } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionInvoiceKeys = {
  all: ['subscription-invoices'] as const,
  lists: () => [...subscriptionInvoiceKeys.all, 'list'] as const,
  list: (companyId: string, filters?: IInvoiceFilters) =>
    [...subscriptionInvoiceKeys.lists(), companyId, filters] as const,
  details: () => [...subscriptionInvoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionInvoiceKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IInvoiceFilters {
  status?: 'draft' | 'sent' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
  dateFrom?: string // ISO date string
  dateTo?: string // ISO date string
}

export interface IUseSubscriptionInvoicesOptions {
  enabled?: boolean
  filters?: IInvoiceFilters
}

export interface IUseSubscriptionInvoiceOptions {
  enabled?: boolean
}

export interface IMarkInvoicePaidOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSubscriptionInvoice>>) => void
  onError?: (error: Error) => void
}

export interface IMarkInvoicePaidData {
  paymentId: string
  paymentMethod: string
  paidDate?: string // ISO date string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Invoices by Company
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch subscription invoices for a management company
 */
export function useSubscriptionInvoices(
  companyId: string,
  options?: IUseSubscriptionInvoicesOptions
) {
  const filters = options?.filters

  // Build query string
  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.dateFrom) queryParams.set('dateFrom', filters.dateFrom)
  if (filters?.dateTo) queryParams.set('dateTo', filters.dateTo)

  const queryString = queryParams.toString()
  const path = `/management-companies/${companyId}/invoices${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiDataResponse<TSubscriptionInvoice[]>>({
    path,
    queryKey: subscriptionInvoiceKeys.list(companyId, filters),
    config: {},
    enabled: options?.enabled !== false && !!companyId,
  })
}

/**
 * Standalone function to fetch invoices
 */
export async function getSubscriptionInvoices(
  companyId: string,
  filters?: IInvoiceFilters
): Promise<TSubscriptionInvoice[]> {
  const client = getHttpClient()
  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.dateFrom) queryParams.set('dateFrom', filters.dateFrom)
  if (filters?.dateTo) queryParams.set('dateTo', filters.dateTo)

  const queryString = queryParams.toString()
  const url = `/management-companies/${companyId}/invoices${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiDataResponse<TSubscriptionInvoice[]>>(url)

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Invoice by ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch a specific invoice by ID
 */
export function useSubscriptionInvoice(
  invoiceId: string,
  options?: IUseSubscriptionInvoiceOptions
) {
  return useApiQuery<TApiDataResponse<TSubscriptionInvoice>>({
    path: `/subscription-invoices/${invoiceId}`,
    queryKey: subscriptionInvoiceKeys.detail(invoiceId),
    config: {},
    enabled: options?.enabled !== false && !!invoiceId,
  })
}

/**
 * Standalone function to fetch an invoice by ID
 */
export async function getSubscriptionInvoice(invoiceId: string): Promise<TSubscriptionInvoice> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TSubscriptionInvoice>>(
    `/subscription-invoices/${invoiceId}`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Mark Invoice as Paid
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to mark an invoice as paid
 */
export function useMarkInvoicePaid(
  invoiceId: string,
  companyId: string,
  options?: IMarkInvoicePaidOptions
) {
  return useApiMutation<TApiDataResponse<TSubscriptionInvoice>, IMarkInvoicePaidData>({
    path: `/subscription-invoices/${invoiceId}/mark-paid`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      subscriptionInvoiceKeys.detail(invoiceId),
      subscriptionInvoiceKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to mark an invoice as paid
 */
export async function markInvoicePaid(
  invoiceId: string,
  data: IMarkInvoicePaidData
): Promise<TSubscriptionInvoice> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TSubscriptionInvoice>>(
    `/subscription-invoices/${invoiceId}/mark-paid`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility - Download Invoice PDF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Function to download invoice as PDF
 * Opens the PDF in a new tab or downloads it
 */
export function downloadInvoicePDF(invoiceId: string): void {
  // Check if we're in a browser environment
  // @ts-ignore - window is only available in browser
  if (typeof window === 'undefined') return

  const url = `/subscription-invoices/${invoiceId}/download-pdf`
  // @ts-ignore - window is only available in browser
  window.open(url, '_blank')
}
