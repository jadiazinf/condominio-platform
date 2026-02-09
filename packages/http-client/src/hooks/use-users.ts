import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiPaginatedResponse, TApiDataResponse, TApiMessageResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'

// =============================================================================
// Types
// =============================================================================

/**
 * Query parameters for listing all users
 */
export interface TUsersQuery {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  roleId?: string
}

/**
 * User role summary (for list view)
 */
export interface TUserRoleSummary {
  id: string // userRole id
  roleId: string
  roleName: string
  condominiumId: string | null
  condominiumName: string | null
  isActive: boolean
}

/**
 * User with roles (for list view)
 */
export interface TUserWithRoles {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  phoneCountryCode: string | null
  phoneNumber: string | null
  idDocumentType: 'CI' | 'RIF' | 'Pasaporte' | null
  idDocumentNumber: string | null
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  roles: TUserRoleSummary[]
}

/**
 * User role detail (for detail view)
 */
export interface TUserRoleDetail {
  id: string
  roleId: string
  roleName: string
  roleDescription: string | null
  isSystemRole: boolean
  condominiumId: string | null
  condominiumName: string | null
  buildingId: string | null
  isActive: boolean
  assignedAt: Date
  notes: string | null
}

/**
 * Condominium with roles (for detail view)
 */
export interface TCondominiumWithRoles {
  id: string
  name: string
  code: string | null
  roles: Array<{
    userRoleId: string
    roleId: string
    roleName: string
    isActive: boolean
  }>
}

/**
 * Permission with enabled status for superadmin detail view
 */
export interface TSuperadminPermissionDetail {
  id: string
  permissionId: string
  module: string
  action: string
  description: string | null
  isEnabled: boolean
}

/**
 * Full user details (for detail view)
 */
export interface TUserFullDetails {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  phoneCountryCode: string | null
  phoneNumber: string | null
  address: string | null
  idDocumentType: 'CI' | 'RIF' | 'Pasaporte' | null
  idDocumentNumber: string | null
  isActive: boolean
  isEmailVerified: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
  userRoles: TUserRoleDetail[]
  isSuperadmin: boolean
  superadminPermissions: TSuperadminPermissionDetail[] | null
  condominiums: TCondominiumWithRoles[] | null
}

/**
 * Role option (for filter dropdown)
 */
export interface TRoleOption {
  id: string
  name: string
  isSystemRole: boolean
}

// =============================================================================
// Hook Options
// =============================================================================

export interface UseUsersPaginatedOptions {
  token: string
  query: TUsersQuery
  enabled?: boolean
}

export interface UseUserFullDetailsOptions {
  token: string
  userId: string
  enabled?: boolean
}

export interface UseRolesOptions {
  token: string
  enabled?: boolean
}

export interface IToggleUserPermissionVariables {
  userId: string
  permissionId: string
  isEnabled: boolean
}

export interface IUseToggleUserPermissionOptions {
  onSuccess?: (data: ApiResponse<TApiMessageResponse>) => void
  onError?: (error: Error) => void
}

export interface IBatchToggleUserPermissionsVariables {
  userId: string
  changes: Array<{ permissionId: string; isEnabled: boolean }>
}

export interface IBatchToggleUserPermissionsResponse {
  data: {
    updated: number
    failed: number
  }
  message: string
}

export interface IUseBatchToggleUserPermissionsOptions {
  onSuccess?: (data: ApiResponse<IBatchToggleUserPermissionsResponse>) => void
  onError?: (error: Error) => void
}

// =============================================================================
// Query Keys
// =============================================================================

export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (query: TUsersQuery) => [...usersKeys.lists(), query] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
  roles: () => [...usersKeys.all, 'roles'] as const,
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch all users with pagination and filtering.
 */
export function useUsersPaginated(options: UseUsersPaginatedOptions) {
  const { token, query, enabled = true } = options

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
  if (query.roleId) params.set('roleId', query.roleId)

  const queryString = params.toString()
  const path = `/platform/users/paginated${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TUserWithRoles>>({
    path,
    queryKey: usersKeys.list(query),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

/**
 * Hook to fetch full user details.
 */
export function useUserFullDetails(options: UseUserFullDetailsOptions) {
  const { token, userId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TUserFullDetails>>({
    path: `/platform/users/${userId}/full`,
    queryKey: usersKeys.detail(userId),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!userId,
  })
}

/**
 * Hook to fetch all roles (for filter dropdown).
 */
export function useRoles(options: UseRolesOptions) {
  const { token, enabled = true } = options

  return useApiQuery<TApiDataResponse<TRoleOption[]>>({
    path: '/platform/users/roles',
    queryKey: usersKeys.roles(),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

/**
 * Hook to toggle a user's permission.
 */
export function useToggleUserPermission(options?: IUseToggleUserPermissionOptions) {
  return useApiMutation<TApiMessageResponse, IToggleUserPermissionVariables>({
    path: (variables) => `/platform/users/${variables.userId}/permissions`,
    method: 'PATCH',
    invalidateKeys: [usersKeys.all],
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

/**
 * Hook to batch toggle multiple user permissions in a single request.
 */
export function useBatchToggleUserPermissions(options?: IUseBatchToggleUserPermissionsOptions) {
  return useApiMutation<IBatchToggleUserPermissionsResponse, IBatchToggleUserPermissionsVariables>({
    path: (variables) => `/platform/users/${variables.userId}/permissions/batch`,
    method: 'PATCH',
    invalidateKeys: [usersKeys.all],
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Function to fetch all users with pagination and filtering.
 */
export async function getUsersPaginated(
  token: string,
  query: TUsersQuery
): Promise<TApiPaginatedResponse<TUserWithRoles>> {
  const client = getHttpClient()

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
  if (query.roleId) params.set('roleId', query.roleId)

  const queryString = params.toString()
  const path = `/platform/users/paginated${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiPaginatedResponse<TUserWithRoles>>(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}

/**
 * Function to fetch full user details.
 */
export async function getUserFullDetails(
  token: string,
  userId: string
): Promise<TUserFullDetails> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TUserFullDetails>>(`/platform/users/${userId}/full`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

/**
 * Function to fetch all roles.
 */
export async function getAllRoles(token: string): Promise<TRoleOption[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TRoleOption[]>>('/platform/users/roles', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

/**
 * Function to update user status.
 * @returns The success message from the API
 */
export async function updateUserStatus(
  token: string,
  userId: string,
  isActive: boolean
): Promise<string> {
  const client = getHttpClient()

  const response = await client.patch<TApiMessageResponse>(
    `/platform/users/${userId}/status`,
    { isActive },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data.message
}

/**
 * Function to update user role status.
 * @returns The success message from the API
 */
export async function updateUserRoleStatus(
  token: string,
  userRoleId: string,
  isActive: boolean
): Promise<string> {
  const client = getHttpClient()

  const response = await client.patch<TApiMessageResponse>(
    `/user-roles/${userRoleId}`,
    { isActive },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data.message
}

/**
 * Function to toggle a user's permission.
 * @returns The success message from the API
 */
export async function toggleUserPermission(
  token: string,
  userId: string,
  permissionId: string,
  isEnabled: boolean
): Promise<string> {
  const client = getHttpClient()

  const response = await client.patch<TApiMessageResponse>(
    `/platform/users/${userId}/permissions`,
    { permissionId, isEnabled },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data.message
}

/**
 * Batch result from the API
 */
export interface IBatchTogglePermissionsResult {
  updated: number
  failed: number
}

/**
 * Function to batch toggle multiple user permissions.
 * @returns The success message and result from the API
 */
export async function batchToggleUserPermissions(
  token: string,
  userId: string,
  changes: Array<{ permissionId: string; isEnabled: boolean }>
): Promise<{ message: string; data: IBatchTogglePermissionsResult }> {
  const client = getHttpClient()

  const response = await client.patch<TApiDataResponse<IBatchTogglePermissionsResult> & { message: string }>(
    `/platform/users/${userId}/permissions/batch`,
    { changes },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return {
    message: response.data.message,
    data: response.data.data,
  }
}
