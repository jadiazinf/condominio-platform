import type { TBuilding } from '@packages/domain'
import type { TApiDataResponse, TApiMessageResponse } from '../types'
import type { ApiResponse } from '../types/http'

import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client'

// Query keys for buildings
export const buildingsKeys = {
  all: ['buildings'] as const,
  list: (condominiumId: string) => [...buildingsKeys.all, 'list', condominiumId] as const,
  detail: (id: string) => [...buildingsKeys.all, 'detail', id] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

export interface UseCondominiumBuildingsOptions {
  token: string
  condominiumId: string
  enabled?: boolean
}

/**
 * Hook to get all buildings for a specific condominium.
 */
export function useCondominiumBuildings(options: UseCondominiumBuildingsOptions) {
  const { token, condominiumId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TBuilding[]>>({
    path: '/condominium/buildings',
    queryKey: buildingsKeys.list(condominiumId),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

// ============================================================================
// Simple Client-Side Hook (no token required — uses global HttpClient auth)
// ============================================================================

export interface UseCondominiumBuildingsListOptions {
  condominiumId: string
  managementCompanyId?: string
  enabled?: boolean
}

/**
 * Hook to get all buildings for a condominium using the global HttpClient.
 * Does NOT require a token — auth is handled by the HttpClientProvider context.
 */
export function useCondominiumBuildingsList(options: UseCondominiumBuildingsListOptions) {
  const { condominiumId, managementCompanyId, enabled = true } = options

  const headers: Record<string, string> = {
    'x-condominium-id': condominiumId,
  }
  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  return useApiQuery<TApiDataResponse<TBuilding[]>>({
    path: '/condominium/buildings',
    queryKey: buildingsKeys.list(condominiumId),
    enabled: enabled && !!condominiumId,
    config: { headers },
  })
}

// ============================================================================

export interface UseBuildingDetailOptions {
  token: string
  buildingId: string
  enabled?: boolean
}

/**
 * Hook to get detailed information about a specific building.
 */
export function useBuildingDetail(options: UseBuildingDetailOptions) {
  const { token, buildingId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TBuilding>>({
    path: `/condominium/buildings/${buildingId}`,
    queryKey: buildingsKeys.detail(buildingId),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export interface UseCreateBuildingOptions {
  onSuccess?: (response: TApiDataResponse<TBuilding>) => void
  onError?: (error: Error) => void
}

export interface TCreateBuildingVariables {
  condominiumId: string
  name: string
  code?: string | null
  address?: string | null
  floorsCount?: number | null
  bankAccountHolder?: string | null
  bankName?: string | null
  bankAccountNumber?: string | null
  bankAccountType?: 'Corriente' | 'Ahorro' | null
}

/**
 * Hook to create a new building.
 */
export function useCreateBuilding(options: UseCreateBuildingOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TBuilding>, TCreateBuildingVariables>({
    path: '/condominium/buildings',
    method: 'POST',
    invalidateKeys: [buildingsKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TBuilding>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseUpdateBuildingOptions {
  onSuccess?: (response: TApiDataResponse<TBuilding>) => void
  onError?: (error: Error) => void
}

export interface TUpdateBuildingVariables {
  buildingId: string
  name?: string
  code?: string | null
  address?: string | null
  floorsCount?: number | null
  bankAccountHolder?: string | null
  bankName?: string | null
  bankAccountNumber?: string | null
  bankAccountType?: 'Corriente' | 'Ahorro' | null
}

/**
 * Hook to update an existing building.
 */
export function useUpdateBuilding(options: UseUpdateBuildingOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TBuilding>, TUpdateBuildingVariables>({
    path: (variables: TUpdateBuildingVariables) => `/condominium/buildings/${variables.buildingId}`,
    method: 'PATCH',
    invalidateKeys: [buildingsKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TBuilding>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseDeleteBuildingOptions {
  onSuccess?: (response: TApiMessageResponse) => void
  onError?: (error: Error) => void
}

export interface TDeleteBuildingVariables {
  buildingId: string
}

/**
 * Hook to delete a building.
 */
export function useDeleteBuilding(options: UseDeleteBuildingOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiMessageResponse, TDeleteBuildingVariables>({
    path: (variables: TDeleteBuildingVariables) => `/condominium/buildings/${variables.buildingId}`,
    method: 'DELETE',
    invalidateKeys: [buildingsKeys.all],
    onSuccess: (response: ApiResponse<TApiMessageResponse>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseToggleBuildingStatusOptions {
  onSuccess?: (response: TApiMessageResponse) => void
  onError?: (error: Error) => void
}

export interface TToggleBuildingStatusVariables {
  buildingId: string
  isActive: boolean
}

/**
 * Hook to toggle building active status.
 */
export function useToggleBuildingStatus(options: UseToggleBuildingStatusOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiMessageResponse, TToggleBuildingStatusVariables>({
    path: (variables: TToggleBuildingStatusVariables) => `/condominium/buildings/${variables.buildingId}/status`,
    method: 'PATCH',
    invalidateKeys: [buildingsKeys.all],
    onSuccess: (response: ApiResponse<TApiMessageResponse>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

// ============================================================================
// Direct Creation Functions (for wizard flows without global context)
// ============================================================================

/**
 * Create a building directly with explicit condominium context.
 * Used in the condominium creation wizard where no global condominium ID is set.
 * Auth is handled automatically by the HttpClient via session cookies.
 */
export async function createBuildingDirect(
  condominiumId: string,
  data: Omit<TCreateBuildingVariables, 'condominiumId'>
): Promise<TBuilding> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TBuilding>>(
    '/condominium/buildings',
    { ...data, condominiumId },
    {
      headers: {
        'x-condominium-id': condominiumId,
      },
    }
  )
  return response.data.data
}

/**
 * Create multiple buildings in a single bulk request.
 * Used in the condominium creation wizard to avoid N individual requests.
 * Auth is handled automatically by the HttpClient via session cookies.
 */
export async function createBuildingsBulk(
  condominiumId: string,
  buildings: Omit<TCreateBuildingVariables, 'condominiumId'>[]
): Promise<TBuilding[]> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TBuilding[]>>(
    '/condominium/buildings/bulk',
    { buildings },
    {
      headers: {
        'x-condominium-id': condominiumId,
      },
    }
  )
  return response.data.data
}

// ============================================================================
// Server-side Functions
// ============================================================================

/**
 * Server-side function to get all buildings for a condominium.
 */
export async function getCondominiumBuildings(
  token: string,
  condominiumId: string,
  managementCompanyId?: string
): Promise<TBuilding[]> {
  const client = getHttpClient()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'x-condominium-id': condominiumId,
  }

  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  const response = await client.get<TApiDataResponse<TBuilding[]>>(
    '/condominium/buildings',
    { headers }
  )

  return response.data.data
}

/**
 * Server-side function to get building details.
 */
export async function getBuildingDetail(
  token: string,
  buildingId: string,
  condominiumId?: string,
  managementCompanyId?: string
): Promise<TBuilding> {
  const client = getHttpClient()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (condominiumId) {
    headers['x-condominium-id'] = condominiumId
  }
  if (managementCompanyId) {
    headers['x-management-company-id'] = managementCompanyId
  }

  const response = await client.get<TApiDataResponse<TBuilding>>(`/condominium/buildings/${buildingId}`, {
    headers,
  })

  return response.data.data
}
