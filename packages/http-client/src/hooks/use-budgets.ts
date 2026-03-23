import { useApiMutation, useApiQuery } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TBudget, TBudgetItem, TBudgetUpdate } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IBudgetWithItems extends TBudget {
  items: TBudgetItem[]
}

export interface ICreateBudgetItemInput {
  expenseCategoryId: string | null
  description: string
  budgetedAmount: string
  notes: string | null
}

export interface ICreateBudgetInput {
  name: string
  description: string | null
  budgetType: 'monthly' | 'quarterly' | 'annual'
  periodYear: number
  periodMonth: number | null
  currencyId: string
  reserveFundPercentage: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  items: ICreateBudgetItemInput[]
}

export interface IUnitQuota {
  unitId: string
  unitNumber: string
  aliquotPercentage: string
  amount: string
}

export interface ISkippedUnit {
  unitId: string
  unitNumber: string
  reason: string
}

export interface ICalculateQuotasResult {
  budgetId: string
  budgetTotal: string
  reserveFundPercentage: string
  totalWithReserve: string
  quotas: IUnitQuota[]
  skippedUnits: ISkippedUnit[]
}

export interface IBudgetVsActualItem {
  budgetItemId: string
  expenseCategoryId: string | null
  description: string
  budgetedAmount: string
  actualAmount: string
  variance: string
}

export interface IBudgetVsActualResult {
  budgetId: string
  budgetName: string
  periodYear: number
  periodMonth: number | null
  items: IBudgetVsActualItem[]
  totalBudgeted: string
  totalActual: string
  totalVariance: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const budgetKeys = {
  all: ['budgets'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
  details: () => [...budgetKeys.all, 'detail'] as const,
  detail: (id: string) => [...budgetKeys.details(), id] as const,
  calculateQuotas: (id: string) => [...budgetKeys.all, 'calculate-quotas', id] as const,
  vsActual: (id: string) => [...budgetKeys.all, 'vs-actual', id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Budgets
// ─────────────────────────────────────────────────────────────────────────────

export function useBudgets(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TBudget[]>>({
    path: '/condominium/budgets',
    queryKey: budgetKeys.lists(),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Budget Detail (with items)
// ─────────────────────────────────────────────────────────────────────────────

export function useBudgetDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<IBudgetWithItems>>({
    path: `/condominium/budgets/${id}`,
    queryKey: budgetKeys.detail(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Calculate Quotas
// ─────────────────────────────────────────────────────────────────────────────

export function useBudgetCalculateQuotas(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<ICalculateQuotasResult>>({
    path: `/condominium/budgets/${id}/calculate-quotas`,
    queryKey: budgetKeys.calculateQuotas(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Budget vs Actual
// ─────────────────────────────────────────────────────────────────────────────

export function useBudgetVsActual(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<IBudgetVsActualResult>>({
    path: `/condominium/budgets/${id}/vs-actual`,
    queryKey: budgetKeys.vsActual(id),
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Budget
// ─────────────────────────────────────────────────────────────────────────────

export interface ICreateBudgetOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TBudget>>) => void
  onError?: (error: Error) => void
}

export function useCreateBudget(options?: ICreateBudgetOptions) {
  return useApiMutation<TApiDataResponse<TBudget>, ICreateBudgetInput>({
    path: '/condominium/budgets',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [budgetKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Budget
// ─────────────────────────────────────────────────────────────────────────────

export interface IUpdateBudgetOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TBudget>>) => void
  onError?: (error: Error) => void
}

export function useUpdateBudget(id: string, options?: IUpdateBudgetOptions) {
  return useApiMutation<TApiDataResponse<TBudget>, TBudgetUpdate>({
    path: `/condominium/budgets/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [budgetKeys.all, budgetKeys.detail(id)],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Delete Budget
// ─────────────────────────────────────────────────────────────────────────────

export interface IDeleteBudgetOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TBudget>>) => void
  onError?: (error: Error) => void
}

export function useDeleteBudget(options?: IDeleteBudgetOptions) {
  return useApiMutation<TApiDataResponse<TBudget>, { id: string }>({
    path: data => `/condominium/budgets/${data.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [budgetKeys.all],
  })
}
