import type { TUserRole } from '@packages/domain'

import { useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiPaginatedResponse } from '../types/api-responses'

// =============================================================================
// Types
// =============================================================================

/**
 * Query parameters for listing superadmin users
 */
export interface TSuperadminUsersQuery {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

/**
 * Superadmin user with user details (returned from API)
 */
export interface TSuperadminUserWithDetails extends Omit<TUserRole, 'user' | 'role' | 'assignedByUser'> {
  user: {
    id: string
    email: string
    displayName: string | null
    firstName: string | null
    lastName: string | null
    photoUrl: string | null
    idDocumentType: 'CI' | 'RIF' | 'Pasaporte' | null
    idDocumentNumber: string | null
    isActive: boolean
    lastLogin: Date | null
  }
}

export interface UseSuperadminUsersPaginatedOptions {
  token: string
  query: TSuperadminUsersQuery
  enabled?: boolean
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch superadmin users with pagination and filtering.
 * Requires platform_superadmins read permission.
 */
export function useSuperadminUsersPaginated(options: UseSuperadminUsersPaginatedOptions) {
  const { token, query, enabled = true } = options

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/platform/users/superadmin${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TSuperadminUserWithDetails>>({
    path,
    queryKey: ['superadmin-users', 'paginated', query],
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
 * Function to fetch superadmin users with pagination and filtering.
 */
export async function getSuperadminUsersPaginated(
  token: string,
  query: TSuperadminUsersQuery
): Promise<TApiPaginatedResponse<TSuperadminUserWithDetails>> {
  const client = getHttpClient()

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/platform/users/superadmin${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiPaginatedResponse<TSuperadminUserWithDetails>>(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}
