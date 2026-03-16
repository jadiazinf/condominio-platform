import { useApiQuery, useApiMutation } from './use-api-query'
import type {
  TReserveFundPaymentsQuery,
  TReserveFundExpensesQuery,
  TReserveFundSummary,
  TPayment,
  TExpense,
  TDocument,
  TCondominiumService,
} from '@packages/domain'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const reserveFundKeys = {
  all: ['reserve-fund'] as const,
  summary: (companyId: string, condominiumId: string) =>
    [...reserveFundKeys.all, 'summary', companyId, condominiumId] as const,
  payments: (companyId: string, query: TReserveFundPaymentsQuery) =>
    [...reserveFundKeys.all, 'payments', companyId, query] as const,
  expenses: (companyId: string, query: TReserveFundExpensesQuery) =>
    [...reserveFundKeys.all, 'expenses', companyId, query] as const,
  expenseDetail: (companyId: string, expenseId: string) =>
    [...reserveFundKeys.all, 'expense-detail', companyId, expenseId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseReserveFundSummaryOptions {
  companyId: string
  condominiumId: string
  enabled?: boolean
}

export interface IUseReserveFundPaymentsPaginatedOptions {
  companyId: string
  query: TReserveFundPaymentsQuery
  enabled?: boolean
}

export interface IUseReserveFundExpensesPaginatedOptions {
  companyId: string
  query: TReserveFundExpensesQuery
  enabled?: boolean
}

export interface ICreateReserveFundExpenseVariables {
  condominiumId: string
  name: string
  description?: string
  expenseDate: string
  amount: string
  currencyId: string
  serviceIds?: string[]
  vendorName?: string
  vendorTaxId?: string
  vendorType?: 'individual' | 'company'
  vendorPhone?: string
  vendorEmail?: string
  vendorAddress?: string
  invoiceNumber?: string
  notes?: string
  documents?: Array<{
    title: string
    fileUrl: string
    fileName: string
    fileSize: number
    fileType: string
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useReserveFundSummary(options: IUseReserveFundSummaryOptions) {
  const { companyId, condominiumId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TReserveFundSummary>>({
    path: `/${companyId}/me/reserve-fund/summary?condominiumId=${condominiumId}`,
    queryKey: reserveFundKeys.summary(companyId, condominiumId),
    enabled: enabled && !!companyId && !!condominiumId,
  })
}

export function useReserveFundPaymentsPaginated(options: IUseReserveFundPaymentsPaginatedOptions) {
  const { companyId, query, enabled = true } = options

  const params = new URLSearchParams()
  params.set('condominiumId', query.condominiumId)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.unitId) params.set('unitId', query.unitId)
  if (query.conceptId) params.set('conceptId', query.conceptId)
  if (query.startDate) params.set('startDate', query.startDate)
  if (query.endDate) params.set('endDate', query.endDate)

  const queryString = params.toString()
  const path = `/${companyId}/me/reserve-fund/payments?${queryString}`

  return useApiQuery<TApiPaginatedResponse<TPayment>>({
    path,
    queryKey: reserveFundKeys.payments(companyId, query),
    enabled: enabled && !!companyId && !!query.condominiumId,
  })
}

export function useReserveFundExpensesPaginated(options: IUseReserveFundExpensesPaginatedOptions) {
  const { companyId, query, enabled = true } = options

  const params = new URLSearchParams()
  params.set('condominiumId', query.condominiumId)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.status) params.set('status', query.status)
  if (query.startDate) params.set('startDate', query.startDate)
  if (query.endDate) params.set('endDate', query.endDate)

  const queryString = params.toString()
  const path = `/${companyId}/me/reserve-fund/expenses?${queryString}`

  return useApiQuery<TApiPaginatedResponse<TExpense>>({
    path,
    queryKey: reserveFundKeys.expenses(companyId, query),
    enabled: enabled && !!companyId && !!query.condominiumId,
  })
}

export interface IUseReserveFundExpenseDetailOptions {
  companyId: string
  expenseId: string
  enabled?: boolean
}

export type TExpenseWithDocuments = TExpense & {
  documents: TDocument[]
  services: TCondominiumService[]
}

export function useReserveFundExpenseDetail(options: IUseReserveFundExpenseDetailOptions) {
  const { companyId, expenseId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TExpenseWithDocuments>>({
    path: `/${companyId}/me/reserve-fund/expenses/${expenseId}`,
    queryKey: reserveFundKeys.expenseDetail(companyId, expenseId),
    enabled: enabled && !!companyId && !!expenseId,
  })
}

export function useCreateReserveFundExpense(managementCompanyId: string) {
  return useApiMutation<TApiDataResponse<TExpense>, ICreateReserveFundExpenseVariables>({
    path: `/${managementCompanyId}/me/reserve-fund/expenses`,
    method: 'POST',
    invalidateKeys: [reserveFundKeys.all],
  })
}
