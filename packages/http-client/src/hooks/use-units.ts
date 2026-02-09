import type { TUnit } from '@packages/domain'
import type { TApiDataResponse, TApiMessageResponse } from '../types'
import type { ApiResponse } from '../types/http'

import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client'

// Query keys for units
export const unitsKeys = {
  all: ['units'] as const,
  list: (buildingId: string) => [...unitsKeys.all, 'list', buildingId] as const,
  detail: (id: string) => [...unitsKeys.all, 'detail', id] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

export interface UseBuildingUnitsOptions {
  token: string
  buildingId: string
  enabled?: boolean
}

/**
 * Hook to get all units for a specific building.
 */
export function useBuildingUnits(options: UseBuildingUnitsOptions) {
  const { token, buildingId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TUnit[]>>({
    path: `/condominium/units?buildingId=${buildingId}`,
    queryKey: unitsKeys.list(buildingId),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

export interface UseUnitDetailOptions {
  token: string
  unitId: string
  enabled?: boolean
}

/**
 * Hook to get detailed information about a specific unit.
 */
export function useUnitDetail(options: UseUnitDetailOptions) {
  const { token, unitId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TUnit>>({
    path: `/condominium/units/${unitId}`,
    queryKey: unitsKeys.detail(unitId),
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

export interface UseCreateUnitOptions {
  onSuccess?: (response: TApiDataResponse<TUnit>) => void
  onError?: (error: Error) => void
}

export interface TCreateUnitVariables {
  buildingId: string
  unitNumber: string
  floor?: number | null
  areaM2?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  parkingSpaces?: number
  parkingIdentifiers?: string[] | null
  storageIdentifier?: string | null
  aliquotPercentage?: string | null
}

/**
 * Hook to create a new unit.
 */
export function useCreateUnit(options: UseCreateUnitOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TUnit>, TCreateUnitVariables>({
    path: '/condominium/units',
    method: 'POST',
    invalidateKeys: [unitsKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TUnit>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseUpdateUnitOptions {
  onSuccess?: (response: TApiDataResponse<TUnit>) => void
  onError?: (error: Error) => void
}

export interface TUpdateUnitVariables {
  unitId: string
  unitNumber?: string
  floor?: number | null
  areaM2?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  parkingSpaces?: number
  parkingIdentifiers?: string[] | null
  storageIdentifier?: string | null
  aliquotPercentage?: string | null
}

/**
 * Hook to update an existing unit.
 */
export function useUpdateUnit(options: UseUpdateUnitOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TUnit>, TUpdateUnitVariables>({
    path: (variables: TUpdateUnitVariables) => `/condominium/units/${variables.unitId}`,
    method: 'PATCH',
    invalidateKeys: [unitsKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TUnit>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseDeleteUnitOptions {
  onSuccess?: (response: TApiMessageResponse) => void
  onError?: (error: Error) => void
}

export interface TDeleteUnitVariables {
  unitId: string
}

/**
 * Hook to delete a unit.
 */
export function useDeleteUnit(options: UseDeleteUnitOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiMessageResponse, TDeleteUnitVariables>({
    path: (variables: TDeleteUnitVariables) => `/condominium/units/${variables.unitId}`,
    method: 'DELETE',
    invalidateKeys: [unitsKeys.all],
    onSuccess: (response: ApiResponse<TApiMessageResponse>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseToggleUnitStatusOptions {
  onSuccess?: (response: TApiMessageResponse) => void
  onError?: (error: Error) => void
}

export interface TToggleUnitStatusVariables {
  unitId: string
  isActive: boolean
}

/**
 * Hook to toggle unit active status.
 */
export function useToggleUnitStatus(options: UseToggleUnitStatusOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiMessageResponse, TToggleUnitStatusVariables>({
    path: (variables: TToggleUnitStatusVariables) => `/condominium/units/${variables.unitId}/status`,
    method: 'PATCH',
    invalidateKeys: [unitsKeys.all],
    onSuccess: (response: ApiResponse<TApiMessageResponse>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

// ============================================================================
// Server-side Functions
// ============================================================================

/**
 * Server-side function to get all units for a building.
 */
export async function getBuildingUnits(token: string, buildingId: string): Promise<TUnit[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TUnit[]>>(`/condominium/units?buildingId=${buildingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

/**
 * Server-side function to get unit details.
 */
export async function getUnitDetail(token: string, unitId: string): Promise<TUnit> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TUnit>>(`/condominium/units/${unitId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}
