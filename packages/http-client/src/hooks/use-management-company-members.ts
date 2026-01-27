import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type {
  TManagementCompanyMember,
  TManagementCompanyMemberCreate,
  TManagementCompanyMemberUpdate,
} from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const managementCompanyMemberKeys = {
  all: ['management-company-members'] as const,
  lists: () => [...managementCompanyMemberKeys.all, 'list'] as const,
  list: (companyId: string) => [...managementCompanyMemberKeys.lists(), companyId] as const,
  details: () => [...managementCompanyMemberKeys.all, 'detail'] as const,
  detail: (id: string) => [...managementCompanyMemberKeys.details(), id] as const,
  primaryAdmin: (companyId: string) =>
    [...managementCompanyMemberKeys.all, 'primary-admin', companyId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseManagementCompanyMembersOptions {
  enabled?: boolean
}

export interface IUsePrimaryAdminOptions {
  enabled?: boolean
}

export interface IAddMemberOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TManagementCompanyMember>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateMemberOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TManagementCompanyMember>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateMemberPermissionsOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TManagementCompanyMember>>) => void
  onError?: (error: Error) => void
}

export interface IRemoveMemberOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<void>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateMemberPermissionsData {
  permissions: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Members
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch all members of a management company
 */
export function useManagementCompanyMembers(
  companyId: string,
  options?: IUseManagementCompanyMembersOptions
) {
  return useApiQuery<TApiDataResponse<TManagementCompanyMember[]>>({
    path: `/management-companies/${companyId}/members`,
    queryKey: managementCompanyMemberKeys.list(companyId),
    config: {},
    enabled: options?.enabled !== false && !!companyId,
  })
}

/**
 * Standalone function to fetch members
 */
export async function getManagementCompanyMembers(
  companyId: string
): Promise<TManagementCompanyMember[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TManagementCompanyMember[]>>(
    `/management-companies/${companyId}/members`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Primary Admin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch the primary admin of a management company
 */
export function usePrimaryAdmin(companyId: string, options?: IUsePrimaryAdminOptions) {
  return useApiQuery<TApiDataResponse<TManagementCompanyMember>>({
    path: `/management-companies/${companyId}/primary-admin`,
    queryKey: managementCompanyMemberKeys.primaryAdmin(companyId),
    config: {},
    enabled: options?.enabled !== false && !!companyId,
  })
}

/**
 * Standalone function to fetch primary admin
 */
export async function getPrimaryAdmin(companyId: string): Promise<TManagementCompanyMember> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TManagementCompanyMember>>(
    `/management-companies/${companyId}/primary-admin`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Add Member
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to add a new member to a management company
 */
export function useAddMember(companyId: string, options?: IAddMemberOptions) {
  return useApiMutation<TApiDataResponse<TManagementCompanyMember>, TManagementCompanyMemberCreate>(
    {
      path: `/management-companies/${companyId}/members`,
      method: 'POST',
      config: {},
      onSuccess: options?.onSuccess,
      onError: options?.onError,
      invalidateKeys: [
        managementCompanyMemberKeys.list(companyId),
        managementCompanyMemberKeys.primaryAdmin(companyId),
      ],
    }
  )
}

/**
 * Standalone function to add a member
 */
export async function addMember(
  companyId: string,
  data: TManagementCompanyMemberCreate
): Promise<TManagementCompanyMember> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TManagementCompanyMember>>(
    `/management-companies/${companyId}/members`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Member
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to update a member
 */
export function useUpdateMember(
  memberId: string,
  companyId: string,
  options?: IUpdateMemberOptions
) {
  return useApiMutation<TApiDataResponse<TManagementCompanyMember>, TManagementCompanyMemberUpdate>(
    {
      path: `/management-company-members/${memberId}`,
      method: 'PATCH',
      config: {},
      onSuccess: options?.onSuccess,
      onError: options?.onError,
      invalidateKeys: [
        managementCompanyMemberKeys.detail(memberId),
        managementCompanyMemberKeys.list(companyId),
        managementCompanyMemberKeys.primaryAdmin(companyId),
      ],
    }
  )
}

/**
 * Standalone function to update a member
 */
export async function updateMember(
  memberId: string,
  data: TManagementCompanyMemberUpdate
): Promise<TManagementCompanyMember> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TManagementCompanyMember>>(
    `/management-company-members/${memberId}`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Member Permissions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to update a member's permissions
 */
export function useUpdateMemberPermissions(
  memberId: string,
  companyId: string,
  options?: IUpdateMemberPermissionsOptions
) {
  return useApiMutation<TApiDataResponse<TManagementCompanyMember>, IUpdateMemberPermissionsData>({
    path: `/management-company-members/${memberId}/permissions`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanyMemberKeys.detail(memberId),
      managementCompanyMemberKeys.list(companyId),
    ],
  })
}

/**
 * Standalone function to update member permissions
 */
export async function updateMemberPermissions(
  memberId: string,
  permissions: Record<string, unknown>
): Promise<TManagementCompanyMember> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TManagementCompanyMember>>(
    `/management-company-members/${memberId}/permissions`,
    { permissions }
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Remove Member
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to remove a member from a management company
 */
export function useRemoveMember(
  memberId: string,
  companyId: string,
  options?: IRemoveMemberOptions
) {
  return useApiMutation<TApiDataResponse<void>, void>({
    path: `/management-company-members/${memberId}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      managementCompanyMemberKeys.list(companyId),
      managementCompanyMemberKeys.primaryAdmin(companyId),
    ],
  })
}

/**
 * Standalone function to remove a member
 */
export async function removeMember(memberId: string): Promise<void> {
  const client = getHttpClient()
  await client.delete<TApiDataResponse<void>>(`/management-company-members/${memberId}`)
}
