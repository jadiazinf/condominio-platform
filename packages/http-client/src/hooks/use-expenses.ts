import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TExpense, TExpenseCreate, TExpenseUpdate } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  pendingApproval: () => [...expenseKeys.all, 'pending-approval'] as const,
  byCondominium: (condominiumId: string) =>
    [...expenseKeys.all, 'condominium', condominiumId] as const,
  byBuilding: (buildingId: string) => [...expenseKeys.all, 'building', buildingId] as const,
  byCategory: (categoryId: string) => [...expenseKeys.all, 'category', categoryId] as const,
  byStatus: (status: string) => [...expenseKeys.all, 'status', status] as const,
  byDateRange: (startDate: string, endDate: string) =>
    [...expenseKeys.all, 'date-range', startDate, endDate] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseExpenseDetailOptions {
  enabled?: boolean
}

export interface ICreateExpenseOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TExpense>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateExpenseOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TExpense>>) => void
  onError?: (error: Error) => void
}

export interface IDeleteExpenseOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TExpense>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List All Expenses
// ─────────────────────────────────────────────────────────────────────────────

export function useExpenses(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExpense[]>>({
    path: '/condominium/expenses',
    queryKey: expenseKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Expenses Pending Approval
// ─────────────────────────────────────────────────────────────────────────────

export function useExpensesPendingApproval(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExpense[]>>({
    path: '/condominium/expenses/pending-approval',
    queryKey: expenseKeys.pendingApproval(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Expenses by Condominium
// ─────────────────────────────────────────────────────────────────────────────

export function useExpensesByCondominium(condominiumId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExpense[]>>({
    path: `/condominium/expenses/condominium/${condominiumId}`,
    queryKey: expenseKeys.byCondominium(condominiumId),
    config: {},
    enabled: options?.enabled !== false && !!condominiumId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Expenses by Building
// ─────────────────────────────────────────────────────────────────────────────

export function useExpensesByBuilding(buildingId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExpense[]>>({
    path: `/condominium/expenses/building/${buildingId}`,
    queryKey: expenseKeys.byBuilding(buildingId),
    config: {},
    enabled: options?.enabled !== false && !!buildingId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Expenses by Category
// ─────────────────────────────────────────────────────────────────────────────

export function useExpensesByCategory(categoryId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExpense[]>>({
    path: `/condominium/expenses/category/${categoryId}`,
    queryKey: expenseKeys.byCategory(categoryId),
    config: {},
    enabled: options?.enabled !== false && !!categoryId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Expenses by Status
// ─────────────────────────────────────────────────────────────────────────────

export function useExpensesByStatus(status: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExpense[]>>({
    path: `/condominium/expenses/status/${status}`,
    queryKey: expenseKeys.byStatus(status),
    config: {},
    enabled: options?.enabled !== false && !!status,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Expenses by Date Range
// ─────────────────────────────────────────────────────────────────────────────

export function useExpensesByDateRange(
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean }
) {
  const params = new URLSearchParams()
  params.set('startDate', startDate)
  params.set('endDate', endDate)

  const queryString = params.toString()
  const path = `/condominium/expenses/date-range${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiDataResponse<TExpense[]>>({
    path,
    queryKey: expenseKeys.byDateRange(startDate, endDate),
    config: {},
    enabled: options?.enabled !== false && !!startDate && !!endDate,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Expense by ID
// ─────────────────────────────────────────────────────────────────────────────

export function useExpenseDetail(id: string, options?: IUseExpenseDetailOptions) {
  return useApiQuery<TApiDataResponse<TExpense>>({
    path: `/condominium/expenses/${id}`,
    queryKey: expenseKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Expense
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateExpense(options?: ICreateExpenseOptions) {
  return useApiMutation<TApiDataResponse<TExpense>, TExpenseCreate>({
    path: '/condominium/expenses',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [expenseKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Expense
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateExpense(id: string, options?: IUpdateExpenseOptions) {
  return useApiMutation<TApiDataResponse<TExpense>, TExpenseUpdate>({
    path: `/condominium/expenses/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [expenseKeys.all, expenseKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Delete Expense
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteExpense(options?: IDeleteExpenseOptions) {
  return useApiMutation<TApiDataResponse<TExpense>, { id: string }>({
    path: (data) => `/condominium/expenses/${data.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [expenseKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<TExpense[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpense[]>>('/condominium/expenses')
  return response.data.data
}

export async function getExpensesPendingApproval(): Promise<TExpense[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpense[]>>('/condominium/expenses/pending-approval')
  return response.data.data
}

export async function getExpensesByCondominium(condominiumId: string): Promise<TExpense[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpense[]>>(
    `/condominium/expenses/condominium/${condominiumId}`
  )
  return response.data.data
}

export async function getExpensesByBuilding(buildingId: string): Promise<TExpense[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpense[]>>(
    `/condominium/expenses/building/${buildingId}`
  )
  return response.data.data
}

export async function getExpensesByCategory(categoryId: string): Promise<TExpense[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpense[]>>(
    `/condominium/expenses/category/${categoryId}`
  )
  return response.data.data
}

export async function getExpensesByStatus(status: string): Promise<TExpense[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpense[]>>(`/condominium/expenses/status/${status}`)
  return response.data.data
}

export async function getExpensesByDateRange(
  startDate: string,
  endDate: string
): Promise<TExpense[]> {
  const client = getHttpClient()
  const params = new URLSearchParams()
  params.set('startDate', startDate)
  params.set('endDate', endDate)
  const queryString = params.toString()
  const path = `/condominium/expenses/date-range${queryString ? `?${queryString}` : ''}`
  const response = await client.get<TApiDataResponse<TExpense[]>>(path)
  return response.data.data
}

export async function getExpenseDetail(id: string): Promise<TExpense> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpense>>(`/condominium/expenses/${id}`)
  return response.data.data
}

export async function createExpense(data: TExpenseCreate): Promise<TExpense> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TExpense>>('/condominium/expenses', data)
  return response.data.data
}

export async function updateExpense(id: string, data: TExpenseUpdate): Promise<TExpense> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TExpense>>(`/condominium/expenses/${id}`, data)
  return response.data.data
}

export async function deleteExpense(id: string): Promise<TExpense> {
  const client = getHttpClient()
  const response = await client.delete<TApiDataResponse<TExpense>>(`/condominium/expenses/${id}`)
  return response.data.data
}
