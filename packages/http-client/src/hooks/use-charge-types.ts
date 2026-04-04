import { useApiQuery, useApiMutation } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TChargeType } from '@packages/domain'

// ─── Query Keys ───

export const chargeTypeKeys = {
  all: ['charge-types'] as const,
  lists: () => [...chargeTypeKeys.all, 'list'] as const,
  byCondominium: (condominiumId: string) =>
    [...chargeTypeKeys.lists(), condominiumId] as const,
  detail: (id: string) => [...chargeTypeKeys.all, 'detail', id] as const,
}

// ─── Types ───

export interface IChargeTypeCreateInput {
  condominiumId?: string
  name: string
  categoryId: string
  sortOrder?: number
}

export type IChargeTypeUpdateInput = Partial<IChargeTypeCreateInput>

// ─── Hooks ───

export function useChargeTypes(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TChargeType[]>>({
    queryKey: chargeTypeKeys.lists(),
    path: '/condominium/charge-types',
    config: {},
    enabled: options?.enabled !== false,
  })
}

export function useChargeTypeDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TChargeType>>({
    queryKey: chargeTypeKeys.detail(id),
    path: `/condominium/charge-types/${id}`,
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

export function useCreateChargeType(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TChargeType>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<TChargeType>, IChargeTypeCreateInput>({
    path: '/condominium/charge-types',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [chargeTypeKeys.all],
  })
}

export function useUpdateChargeType(id: string, options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TChargeType>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<TChargeType>, IChargeTypeUpdateInput>({
    path: `/condominium/charge-types/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [chargeTypeKeys.all],
  })
}

export function useDeleteChargeType(options?: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<void>, { id: string }>({
    path: (vars) => `/condominium/charge-types/${vars.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [chargeTypeKeys.all],
  })
}
