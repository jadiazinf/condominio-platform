import { useApiQuery, useApiMutation } from './use-api-query'
import type {
  TPaymentConceptAssignment,
  TPaymentConceptAssignmentUpdate,
} from '@packages/domain'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import { paymentConceptKeys } from './use-payment-concepts'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const paymentConceptAssignmentKeys = {
  all: ['payment-concept-assignments'] as const,
  byConceptId: (companyId: string, conceptId: string) =>
    [...paymentConceptAssignmentKeys.all, 'by-concept', companyId, conceptId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUsePaymentConceptAssignmentsOptions {
  companyId: string
  conceptId: string
  enabled?: boolean
}

export interface ICreateAssignmentVariables {
  conceptId: string
  scopeType: 'condominium' | 'building' | 'unit'
  condominiumId: string
  buildingId?: string
  unitId?: string
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  amount: number
}

export interface ICreateAssignmentOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPaymentConceptAssignment>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateAssignmentVariables extends TPaymentConceptAssignmentUpdate {
  assignmentId: string
}

export interface IUpdateAssignmentOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPaymentConceptAssignment>>) => void
  onError?: (error: Error) => void
}

export interface IDeactivateAssignmentVariables {
  assignmentId: string
}

export interface IDeactivateAssignmentOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TPaymentConceptAssignment>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentConceptAssignments(options: IUsePaymentConceptAssignmentsOptions) {
  const { companyId, conceptId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TPaymentConceptAssignment[]>>({
    path: `/${companyId}/me/payment-concepts/${conceptId}/assignments`,
    queryKey: paymentConceptAssignmentKeys.byConceptId(companyId, conceptId),
    enabled: enabled && !!companyId && !!conceptId,
  })
}

export function useCreateAssignment(
  companyId: string,
  options?: ICreateAssignmentOptions
) {
  return useApiMutation<TApiDataResponse<TPaymentConceptAssignment>, ICreateAssignmentVariables>({
    path: (variables) =>
      `/${companyId}/me/payment-concepts/${variables.conceptId}/assignments`,
    method: 'POST',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentConceptAssignmentKeys.all, paymentConceptKeys.all],
  })
}

export function useUpdateAssignment(
  companyId: string,
  conceptId: string,
  options?: IUpdateAssignmentOptions
) {
  return useApiMutation<TApiDataResponse<TPaymentConceptAssignment>, IUpdateAssignmentVariables>({
    path: (variables) =>
      `/${companyId}/me/payment-concepts/${conceptId}/assignments/${variables.assignmentId}`,
    method: 'PATCH',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentConceptAssignmentKeys.all, paymentConceptKeys.all],
  })
}

export function useDeactivateAssignment(
  companyId: string,
  conceptId: string,
  options?: IDeactivateAssignmentOptions
) {
  return useApiMutation<TApiDataResponse<TPaymentConceptAssignment>, IDeactivateAssignmentVariables>({
    path: (variables) =>
      `/${companyId}/me/payment-concepts/${conceptId}/assignments/${variables.assignmentId}/deactivate`,
    method: 'PATCH',
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [paymentConceptAssignmentKeys.all, paymentConceptKeys.all],
  })
}
