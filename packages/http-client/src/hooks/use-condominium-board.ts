import { useApiQuery, useApiMutation } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TCondominiumBoardMember, TBoardPosition, TBoardMemberStatus } from '@packages/domain'

// ─── Query Keys ───

export const condominiumBoardKeys = {
  all: ['condominium-board'] as const,
  lists: () => [...condominiumBoardKeys.all, 'list'] as const,
  byCondominium: (condominiumId: string) =>
    [...condominiumBoardKeys.lists(), condominiumId] as const,
  detail: (id: string) => [...condominiumBoardKeys.all, 'detail', id] as const,
}

// ─── Hooks ───

export function useCondominiumBoard(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TCondominiumBoardMember[]>>({
    queryKey: condominiumBoardKeys.lists(),
    path: '/condominium/board',
    config: {},
    enabled: options?.enabled !== false,
  })
}

export function useCondominiumBoardDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TCondominiumBoardMember>>({
    queryKey: condominiumBoardKeys.detail(id),
    path: `/condominium/board/${id}`,
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

export function useAddBoardMember(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TCondominiumBoardMember>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<TCondominiumBoardMember>, {
    userId: string
    position: TBoardPosition
    electedAt: string
    termEndsAt?: string | null
    assemblyMinuteId?: string | null
    notes?: string | null
    status?: TBoardMemberStatus
  }>({
    path: '/condominium/board',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [condominiumBoardKeys.all],
  })
}

export function useUpdateBoardMember(id: string, options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TCondominiumBoardMember>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<TCondominiumBoardMember>, Partial<{
    userId: string
    position: TBoardPosition
    electedAt: string
    termEndsAt: string | null
    assemblyMinuteId: string | null
    notes: string | null
    status: TBoardMemberStatus
  }>>({
    path: `/condominium/board/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [condominiumBoardKeys.all],
  })
}

export function useRemoveBoardMember(options?: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<void>, { id: string }>({
    path: (vars) => `/condominium/board/${vars.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [condominiumBoardKeys.all],
  })
}
