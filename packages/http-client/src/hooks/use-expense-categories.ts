import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type {
  TExpenseCategory,
  TExpenseCategoryCreate,
  TExpenseCategoryUpdate,
} from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const expenseCategoryKeys = {
  all: ['expense-categories'] as const,
  lists: () => [...expenseCategoryKeys.all, 'list'] as const,
  root: () => [...expenseCategoryKeys.all, 'root'] as const,
  byParent: (parentCategoryId: string) =>
    [...expenseCategoryKeys.all, 'parent', parentCategoryId] as const,
  details: () => [...expenseCategoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseCategoryKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseExpenseCategoryDetailOptions {
  enabled?: boolean
}

export interface ICreateExpenseCategoryOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TExpenseCategory>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateExpenseCategoryOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TExpenseCategory>>) => void
  onError?: (error: Error) => void
}

export interface IDeleteExpenseCategoryOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TExpenseCategory>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List All Expense Categories
// ─────────────────────────────────────────────────────────────────────────────

export function useExpenseCategories(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExpenseCategory[]>>({
    path: '/condominium/expense-categories',
    queryKey: expenseCategoryKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Root Expense Categories
// ─────────────────────────────────────────────────────────────────────────────

export function useExpenseCategoriesRoot(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TExpenseCategory[]>>({
    path: '/condominium/expense-categories/root',
    queryKey: expenseCategoryKeys.root(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Expense Categories by Parent
// ─────────────────────────────────────────────────────────────────────────────

export function useExpenseCategoriesByParent(
  parentCategoryId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<TExpenseCategory[]>>({
    path: `/condominium/expense-categories/parent/${parentCategoryId}`,
    queryKey: expenseCategoryKeys.byParent(parentCategoryId),
    config: {},
    enabled: options?.enabled !== false && !!parentCategoryId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Expense Category by ID
// ─────────────────────────────────────────────────────────────────────────────

export function useExpenseCategoryDetail(
  id: string,
  options?: IUseExpenseCategoryDetailOptions
) {
  return useApiQuery<TApiDataResponse<TExpenseCategory>>({
    path: `/condominium/expense-categories/${id}`,
    queryKey: expenseCategoryKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Expense Category
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateExpenseCategory(options?: ICreateExpenseCategoryOptions) {
  return useApiMutation<TApiDataResponse<TExpenseCategory>, TExpenseCategoryCreate>({
    path: '/condominium/expense-categories',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [expenseCategoryKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Expense Category
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateExpenseCategory(id: string, options?: IUpdateExpenseCategoryOptions) {
  return useApiMutation<TApiDataResponse<TExpenseCategory>, TExpenseCategoryUpdate>({
    path: `/condominium/expense-categories/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [expenseCategoryKeys.all, expenseCategoryKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Delete Expense Category
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteExpenseCategory(options?: IDeleteExpenseCategoryOptions) {
  return useApiMutation<TApiDataResponse<TExpenseCategory>, { id: string }>({
    path: (data) => `/condominium/expense-categories/${data.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [expenseCategoryKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getExpenseCategories(): Promise<TExpenseCategory[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpenseCategory[]>>('/condominium/expense-categories')
  return response.data.data
}

export async function getExpenseCategoriesRoot(): Promise<TExpenseCategory[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpenseCategory[]>>(
    '/condominium/expense-categories/root'
  )
  return response.data.data
}

export async function getExpenseCategoriesByParent(
  parentCategoryId: string
): Promise<TExpenseCategory[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpenseCategory[]>>(
    `/condominium/expense-categories/parent/${parentCategoryId}`
  )
  return response.data.data
}

export async function getExpenseCategoryDetail(id: string): Promise<TExpenseCategory> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TExpenseCategory>>(
    `/condominium/expense-categories/${id}`
  )
  return response.data.data
}

export async function createExpenseCategory(
  data: TExpenseCategoryCreate
): Promise<TExpenseCategory> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TExpenseCategory>>(
    '/condominium/expense-categories',
    data
  )
  return response.data.data
}

export async function updateExpenseCategory(
  id: string,
  data: TExpenseCategoryUpdate
): Promise<TExpenseCategory> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TExpenseCategory>>(
    `/condominium/expense-categories/${id}`,
    data
  )
  return response.data.data
}

export async function deleteExpenseCategory(id: string): Promise<TExpenseCategory> {
  const client = getHttpClient()
  const response = await client.delete<TApiDataResponse<TExpenseCategory>>(
    `/condominium/expense-categories/${id}`
  )
  return response.data.data
}
