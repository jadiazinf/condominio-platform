import { useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { TRole } from '@packages/domain'

// =============================================================================
// Types
// =============================================================================

export interface TRoleOption {
  id: string
  name: string
  description: string | null
  isSystemRole: boolean
}

// =============================================================================
// Hook Options
// =============================================================================

export interface UseRoleByNameOptions {
  token: string
  roleName: string
  enabled?: boolean
}

export interface UseAssignableRolesOptions {
  token: string
  enabled?: boolean
}

export interface UseAllRolesOptions {
  token: string
  enabled?: boolean
}

export interface UseSystemRolesOptions {
  token: string
  enabled?: boolean
}

// =============================================================================
// Query Keys
// =============================================================================

export const rolesKeys = {
  all: ['roles'] as const,
  lists: () => [...rolesKeys.all, 'list'] as const,
  byName: (name: string) => [...rolesKeys.all, 'by-name', name] as const,
  assignable: () => [...rolesKeys.all, 'assignable'] as const,
  system: () => [...rolesKeys.all, 'system'] as const,
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch a role by name
 */
export function useRoleByName(options: UseRoleByNameOptions) {
  const { token, roleName, enabled = true } = options

  return useApiQuery<TApiDataResponse<TRole>>({
    path: `/roles/name/${roleName}`,
    queryKey: rolesKeys.byName(roleName),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!roleName,
  })
}

/**
 * Hook to fetch assignable roles (all roles except SUPERADMIN)
 */
export function useAssignableRoles(options: UseAssignableRolesOptions) {
  const { token, enabled = true } = options

  return useApiQuery<TApiDataResponse<TRoleOption[]>>({
    path: '/roles/assignable',
    queryKey: rolesKeys.assignable(),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

/**
 * Hook to fetch all roles
 */
export function useAllRoles(options: UseAllRolesOptions) {
  const { token, enabled = true } = options

  return useApiQuery<TApiDataResponse<TRole[]>>({
    path: '/roles',
    queryKey: rolesKeys.lists(),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

/**
 * Hook to fetch system roles
 */
export function useSystemRoles(options: UseSystemRolesOptions) {
  const { token, enabled = true } = options

  return useApiQuery<TApiDataResponse<TRole[]>>({
    path: '/roles/system',
    queryKey: rolesKeys.system(),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Function to fetch a role by name
 */
export async function getRoleByName(token: string, roleName: string): Promise<TRole> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TRole>>(`/roles/name/${roleName}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

/**
 * Function to fetch assignable roles
 */
export async function getAssignableRoles(token: string): Promise<TRoleOption[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TRoleOption[]>>('/roles/assignable', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

/**
 * Function to fetch all roles
 */
export async function getAllRoles(token: string): Promise<TRole[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TRole[]>>('/roles', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

/**
 * Function to fetch system roles
 */
export async function getSystemRoles(token: string): Promise<TRole[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TRole[]>>('/roles/system', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}
