import { useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { TPermission, TRolePermission } from '@packages/domain'

// =============================================================================
// Types
// =============================================================================

export interface TPermissionDetail {
  id: string
  permissionId: string
  module: string
  action: string
  name: string
  description: string | null
}

// =============================================================================
// Hook Options
// =============================================================================

export interface UseAllPermissionsOptions {
  token: string
  enabled?: boolean
}

export interface UseRolePermissionsOptions {
  token: string
  roleId: string
  enabled?: boolean
}

export interface UsePermissionsByModuleOptions {
  token: string
  module: string
  enabled?: boolean
}

// =============================================================================
// Query Keys
// =============================================================================

export const permissionsKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionsKeys.all, 'list'] as const,
  byModule: (module: string) => [...permissionsKeys.all, 'by-module', module] as const,
  rolePermissions: (roleId: string) => [
    ...permissionsKeys.all,
    'role-permissions',
    roleId,
  ] as const,
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch all permissions
 */
export function useAllPermissions(options: UseAllPermissionsOptions) {
  const { token, enabled = true } = options

  return useApiQuery<TApiDataResponse<TPermission[]>>({
    path: '/permissions',
    queryKey: permissionsKeys.lists(),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

/**
 * Hook to fetch permissions for a specific role
 */
export function useRolePermissions(options: UseRolePermissionsOptions) {
  const { token, roleId, enabled = true } = options

  return useApiQuery<TApiDataResponse<TRolePermission[]>>({
    path: `/role-permissions/role/${roleId}`,
    queryKey: permissionsKeys.rolePermissions(roleId),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!roleId,
  })
}

/**
 * Hook to fetch permissions by module
 */
export function usePermissionsByModule(options: UsePermissionsByModuleOptions) {
  const { token, module, enabled = true } = options

  return useApiQuery<TApiDataResponse<TPermission[]>>({
    path: `/permissions/module/${module}`,
    queryKey: permissionsKeys.byModule(module),
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!module,
  })
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Function to fetch all permissions
 */
export async function getAllPermissions(token: string): Promise<TPermission[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TPermission[]>>('/permissions', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

/**
 * Function to fetch permissions for a specific role
 */
export async function getRolePermissions(
  token: string,
  roleId: string
): Promise<TRolePermission[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TRolePermission[]>>(
    `/role-permissions/role/${roleId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Function to fetch permissions by module
 */
export async function getPermissionsByModule(
  token: string,
  module: string
): Promise<TPermission[]> {
  const client = getHttpClient()

  const response = await client.get<TApiDataResponse<TPermission[]>>(
    `/permissions/module/${module}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}
