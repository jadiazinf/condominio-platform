import { useApiQuery, useApiMutation } from './use-api-query'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TAssemblyMinute } from '@packages/domain'

// ─── Query Keys ───

export const assemblyMinuteKeys = {
  all: ['assembly-minutes'] as const,
  lists: () => [...assemblyMinuteKeys.all, 'list'] as const,
  byCondominium: (condominiumId: string) =>
    [...assemblyMinuteKeys.lists(), condominiumId] as const,
  detail: (id: string) => [...assemblyMinuteKeys.all, 'detail', id] as const,
}

// ─── Hooks ───

export function useAssemblyMinutes(options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TAssemblyMinute[]>>({
    queryKey: assemblyMinuteKeys.lists(),
    path: '/condominium/assembly-minutes',
    config: {},
    enabled: options?.enabled !== false,
  })
}

export function useAssemblyMinuteDetail(id: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TAssemblyMinute>>({
    queryKey: assemblyMinuteKeys.detail(id),
    path: `/condominium/assembly-minutes/${id}`,
    config: {},
    enabled: options?.enabled !== false && !!id,
  })
}

export function useCreateAssemblyMinute(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TAssemblyMinute>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<TAssemblyMinute>, {
    title: string
    assemblyType: 'ordinary' | 'extraordinary'
    assemblyDate: string
    assemblyLocation?: string | null
    quorumPercentage?: string | null
    attendeesCount?: number | null
    totalUnits?: number | null
    agenda?: string | null
    decisions?: Record<string, unknown> | null
    notes?: string | null
    documentUrl?: string | null
    documentFileName?: string | null
    status?: 'draft' | 'approved' | 'voided'
  }>({
    path: '/condominium/assembly-minutes',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [assemblyMinuteKeys.all],
  })
}

export function useUpdateAssemblyMinute(id: string, options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TAssemblyMinute>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<TAssemblyMinute>, Partial<{
    title: string
    assemblyType: 'ordinary' | 'extraordinary'
    assemblyDate: string
    assemblyLocation: string | null
    quorumPercentage: string | null
    attendeesCount: number | null
    totalUnits: number | null
    agenda: string | null
    decisions: Record<string, unknown> | null
    notes: string | null
    documentUrl: string | null
    documentFileName: string | null
    status: 'draft' | 'approved' | 'voided'
  }>>({
    path: `/condominium/assembly-minutes/${id}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [assemblyMinuteKeys.all],
  })
}

export function useDeleteAssemblyMinute(options?: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<void>, { id: string }>({
    path: (vars) => `/condominium/assembly-minutes/${vars.id}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [assemblyMinuteKeys.all],
  })
}
