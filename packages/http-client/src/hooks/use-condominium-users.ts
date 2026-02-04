import type { TUser, TUserRole, TUnitOwnership } from '@packages/domain'
import type { TApiDataResponse, TApiMessageResponse } from '../types'
import type { ApiResponse } from '../types/http'

import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client'

// ============================================================================
// Types
// ============================================================================

/**
 * User with their roles and units in a specific condominium.
 */
export interface TCondominiumUser extends TUser {
  roles: TCondominiumUserRole[]
  units: TCondominiumUserUnit[]
}

export interface TCondominiumUserRole {
  id: string
  roleId: string
  roleName: string
  roleKey: string
  isActive: boolean
  assignedAt: Date
}

export interface TCondominiumUserUnit {
  id: string
  unitId: string
  unitNumber: string
  buildingId: string
  buildingName: string
  ownershipType: 'owner' | 'co-owner' | 'tenant'
  isActive: boolean
}

// Query keys for condominium users
export const condominiumUsersKeys = {
  all: ['condominiumUsers'] as const,
  list: (condominiumId: string) => [...condominiumUsersKeys.all, 'list', condominiumId] as const,
  detail: (condominiumId: string, userId: string) =>
    [...condominiumUsersKeys.all, 'detail', condominiumId, userId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

export interface UseCondominiumUsersOptions {
  token: string
  condominiumId: string
  enabled?: boolean
}

/**
 * Hook to get all users with roles and units for a specific condominium.
 */
export function useCondominiumUsers(options: UseCondominiumUsersOptions) {
  const { token, condominiumId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TCondominiumUser[]>>({
    path: `/condominiums/${condominiumId}/users`,
    queryKey: condominiumUsersKeys.list(condominiumId),
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

export interface UseAddUserToCondominiumOptions {
  onSuccess?: (response: TApiDataResponse<TUserRole>) => void
  onError?: (error: Error) => void
}

export interface TAddUserToCondominiumVariables {
  condominiumId: string
  userId: string
  roleId: string
  buildingId?: string | null
  notes?: string | null
}

/**
 * Hook to add an existing user to a condominium with a specific role.
 */
export function useAddUserToCondominium(options: UseAddUserToCondominiumOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TUserRole>, TAddUserToCondominiumVariables>({
    path: (variables: TAddUserToCondominiumVariables) =>
      `/condominiums/${variables.condominiumId}/users`,
    method: 'POST',
    invalidateKeys: [condominiumUsersKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TUserRole>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseRemoveUserFromCondominiumOptions {
  onSuccess?: (response: TApiMessageResponse) => void
  onError?: (error: Error) => void
}

export interface TRemoveUserFromCondominiumVariables {
  condominiumId: string
  userId: string
}

/**
 * Hook to remove a user from a condominium (deactivates all their roles).
 */
export function useRemoveUserFromCondominium(options: UseRemoveUserFromCondominiumOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiMessageResponse, TRemoveUserFromCondominiumVariables>({
    path: (variables: TRemoveUserFromCondominiumVariables) =>
      `/condominiums/${variables.condominiumId}/users/${variables.userId}`,
    method: 'DELETE',
    invalidateKeys: [condominiumUsersKeys.all],
    onSuccess: (response: ApiResponse<TApiMessageResponse>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseUpdateUserRoleOptions {
  onSuccess?: (response: TApiDataResponse<TUserRole>) => void
  onError?: (error: Error) => void
}

export interface TUpdateUserRoleVariables {
  userRoleId: string
  roleId?: string
  isActive?: boolean
  notes?: string | null
}

/**
 * Hook to update a user's role in a condominium.
 */
export function useUpdateUserCondominiumRole(options: UseUpdateUserRoleOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TUserRole>, TUpdateUserRoleVariables>({
    path: (variables: TUpdateUserRoleVariables) => `/user-roles/${variables.userRoleId}`,
    method: 'PATCH',
    invalidateKeys: [condominiumUsersKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TUserRole>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseAssignUnitToUserOptions {
  onSuccess?: (response: TApiDataResponse<TUnitOwnership>) => void
  onError?: (error: Error) => void
}

export interface TAssignUnitToUserVariables {
  unitId: string
  userId: string
  ownershipType: 'owner' | 'co-owner' | 'tenant'
  ownershipPercentage?: string | null
  startDate: string // ISO date string
  endDate?: string | null
  isPrimaryResidence?: boolean
}

/**
 * Hook to assign a unit to a user.
 */
export function useAssignUnitToUser(options: UseAssignUnitToUserOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiDataResponse<TUnitOwnership>, TAssignUnitToUserVariables>({
    path: (variables: TAssignUnitToUserVariables) => `/units/${variables.unitId}/ownerships`,
    method: 'POST',
    invalidateKeys: [condominiumUsersKeys.all],
    onSuccess: (response: ApiResponse<TApiDataResponse<TUnitOwnership>>) => {
      onSuccess?.(response.data)
    },
    onError,
  })
}

export interface UseRemoveUnitFromUserOptions {
  onSuccess?: (response: TApiMessageResponse) => void
  onError?: (error: Error) => void
}

export interface TRemoveUnitFromUserVariables {
  ownershipId: string
}

/**
 * Hook to remove a unit assignment from a user.
 */
export function useRemoveUnitFromUser(options: UseRemoveUnitFromUserOptions = {}) {
  const { onSuccess, onError } = options

  return useApiMutation<TApiMessageResponse, TRemoveUnitFromUserVariables>({
    path: (variables: TRemoveUnitFromUserVariables) =>
      `/unit-ownerships/${variables.ownershipId}`,
    method: 'DELETE',
    invalidateKeys: [condominiumUsersKeys.all],
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
 * Server-side function to get all users for a condominium with their roles and units.
 */
export async function getCondominiumUsers(
  token: string,
  condominiumId: string
): Promise<TCondominiumUser[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TCondominiumUser[]>>(
    `/condominiums/${condominiumId}/users`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}
