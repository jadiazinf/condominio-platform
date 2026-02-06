import type {
  TManagementCompany,
  TManagementCompanyCreate,
  TManagementCompanyUpdate,
  TManagementCompaniesQuery,
  TUser,
  TUserCreate,
  TSubscriptionLimitValidation,
} from '@packages/domain'

import { useApiQuery, useApiMutation } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'

// =============================================================================
// Types
// =============================================================================

export interface UseManagementCompaniesOptions {
  token: string
  enabled?: boolean
}

export interface UseManagementCompaniesPaginatedOptions {
  token: string
  query: TManagementCompaniesQuery
  enabled?: boolean
}

export interface UseManagementCompanyOptions {
  token: string
  id: string
  enabled?: boolean
}

export interface UseCreateManagementCompanyOptions {
  token: string
}

export interface UseUpdateManagementCompanyOptions {
  token: string
}

export interface UseToggleManagementCompanyActiveOptions {
  token: string
}

export interface UseCreateUserOptions {
  token: string
}

export type TCreateManagementCompanyWithAdminInput = {
  company: TManagementCompanyCreate
  admin: TUserCreate
}

export type TCreateManagementCompanyWithAdminResult = {
  company: TManagementCompany
  admin: TUser
}

export type TToggleActiveInput = {
  id: string
  isActive: boolean
}

export type TManagementCompanyUsageStats = {
  condominiumsCount: number
  unitsCount: number
  usersCount: number
  storageGb: number
}

export interface UseManagementCompanyUsageStatsOptions {
  token: string
  id: string
  enabled?: boolean
}

export type TResourceType = 'condominium' | 'unit' | 'user'

export interface UseCanCreateResourceOptions {
  token: string
  managementCompanyId: string
  resourceType: TResourceType
  enabled?: boolean
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch all management companies (non-paginated).
 * @deprecated Use useManagementCompaniesPaginated instead
 */
export function useManagementCompanies(options: UseManagementCompaniesOptions) {
  const { token, enabled = true } = options

  return useApiQuery<TApiDataResponse<TManagementCompany[]>>({
    path: '/management-companies',
    queryKey: ['management-companies'],
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

/**
 * Hook to fetch management companies with pagination and filtering.
 */
export function useManagementCompaniesPaginated(options: UseManagementCompaniesPaginatedOptions) {
  const { token, query, enabled = true } = options

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/management-companies${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TManagementCompany>>({
    path,
    queryKey: ['management-companies', 'paginated', query],
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled,
  })
}

/**
 * Hook to fetch a single management company by ID.
 */
export function useManagementCompany(options: UseManagementCompanyOptions) {
  const { token, id, enabled = true } = options

  return useApiQuery<TApiDataResponse<TManagementCompany>>({
    path: `/management-companies/${id}`,
    queryKey: ['management-companies', id],
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!id,
  })
}

/**
 * Hook to fetch usage statistics for a management company.
 */
export function useManagementCompanyUsageStats(options: UseManagementCompanyUsageStatsOptions) {
  const { token, id, enabled = true } = options

  return useApiQuery<TApiDataResponse<TManagementCompanyUsageStats>>({
    path: `/management-companies/${id}/usage-stats`,
    queryKey: ['management-companies', id, 'usage-stats'],
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!id,
  })
}

/**
 * Hook to check if a management company can create a resource
 * based on their subscription limits.
 */
export function useCanCreateResource(options: UseCanCreateResourceOptions) {
  const { token, managementCompanyId, resourceType, enabled = true } = options

  return useApiQuery<TApiDataResponse<TSubscriptionLimitValidation>>({
    path: `/management-companies/${managementCompanyId}/subscription/can-create/${resourceType}`,
    queryKey: ['management-companies', managementCompanyId, 'can-create', resourceType],
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    enabled: enabled && !!token && !!managementCompanyId && !!resourceType,
  })
}

/**
 * Hook to create a management company.
 */
export function useCreateManagementCompany(options: UseCreateManagementCompanyOptions) {
  const { token } = options

  return useApiMutation<TApiDataResponse<TManagementCompany>, TManagementCompanyCreate>({
    path: '/management-companies',
    method: 'POST',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    invalidateKeys: [['management-companies']],
  })
}

/**
 * Hook to update a management company.
 */
export function useUpdateManagementCompany(options: UseUpdateManagementCompanyOptions) {
  const { token } = options

  return useApiMutation<TApiDataResponse<TManagementCompany>, TManagementCompanyUpdate & { id: string }>({
    path: (data) => `/management-companies/${data.id}`,
    method: 'PATCH',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    invalidateKeys: (data) => [
      ['management-companies'],
      ['management-companies', data.id],
      ['management-companies', 'paginated'],
    ],
  })
}

/**
 * Hook to toggle a management company's active status.
 */
export function useToggleManagementCompanyActive(options: UseToggleManagementCompanyActiveOptions) {
  const { token } = options

  return useApiMutation<TApiDataResponse<TManagementCompany>, TToggleActiveInput>({
    path: '/management-companies',
    method: 'PATCH',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    invalidateKeys: [['management-companies']],
  })
}

/**
 * Hook to create a user.
 */
export function useCreateUser(options: UseCreateUserOptions) {
  const { token } = options

  return useApiMutation<TApiDataResponse<TUser>, TUserCreate>({
    path: '/users',
    method: 'POST',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    invalidateKeys: [['users']],
  })
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Function to fetch all management companies (non-paginated).
 * @deprecated Use getManagementCompaniesPaginated instead
 */
export async function getManagementCompanies(token: string): Promise<TManagementCompany[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TManagementCompany[]>>(
    '/management-companies',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Function to fetch management companies with pagination and filtering.
 */
export async function getManagementCompaniesPaginated(
  token: string,
  query: TManagementCompaniesQuery
): Promise<TApiPaginatedResponse<TManagementCompany>> {
  const client = getHttpClient()

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/management-companies${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiPaginatedResponse<TManagementCompany>>(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}

/**
 * Function to fetch a single management company by ID.
 */
export async function getManagementCompanyById(
  token: string,
  id: string
): Promise<TManagementCompany> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TManagementCompany>>(
    `/management-companies/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Function to create a management company.
 */
export async function createManagementCompany(
  token: string,
  data: TManagementCompanyCreate
): Promise<TManagementCompany> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TManagementCompany>>(
    '/management-companies',
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Function to create a user.
 */
export async function createUser(token: string, data: TUserCreate): Promise<TUser> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TUser>>('/users', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.data
}

/**
 * Function to create a management company with an admin user.
 * This is a compound operation that creates both entities.
 */
export async function createManagementCompanyWithAdmin(
  token: string,
  input: TCreateManagementCompanyWithAdminInput
): Promise<TCreateManagementCompanyWithAdminResult> {
  // First, create the user
  const admin = await createUser(token, input.admin)

  // Then, create the management company with the admin as creator
  const companyData: TManagementCompanyCreate = {
    ...input.company,
    createdBy: admin.id,
  }
  const company = await createManagementCompany(token, companyData)

  return { company, admin }
}

/**
 * Function to toggle a management company's active status.
 */
export async function toggleManagementCompanyActive(
  token: string,
  id: string,
  isActive: boolean
): Promise<TManagementCompany> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TManagementCompany>>(
    `/management-companies/${id}/toggle-active`,
    { isActive },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Function to update a management company.
 */
export async function updateManagementCompany(
  token: string,
  id: string,
  data: TManagementCompanyUpdate
): Promise<TManagementCompany> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TManagementCompany>>(
    `/management-companies/${id}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}

/**
 * Function to fetch usage statistics for a management company.
 */
export async function getManagementCompanyUsageStats(
  token: string,
  id: string
): Promise<TManagementCompanyUsageStats> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TManagementCompanyUsageStats>>(
    `/management-companies/${id}/usage-stats`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data.data
}
