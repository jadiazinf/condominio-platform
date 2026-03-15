import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type {
  TManagementCompanyMember,
  TManagementCompanyMemberUpdate,
  TMemberPermissions,
  TManagementCompanyMembersQuery,
  TMemberRole,
} from '@packages/domain'
import type { TApiPaginatedResponse } from '../types/api-responses'

// Request body type matching the API's AddMemberBodySchema
export interface IAddMemberRequest {
  userId: string
  role: 'admin' | 'accountant' | 'support' | 'viewer'
  permissions?: TMemberPermissions
  isPrimary?: boolean
  invitedBy?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const managementCompanyMemberKeys = {
  all: ['management-company-members'] as const,
  lists: () => [...managementCompanyMemberKeys.all, 'list'] as const,
  list: (companyId: string) => [...managementCompanyMemberKeys.lists(), companyId] as const,
  paginated: (companyId: string, query: TManagementCompanyMembersQuery) =>
    [...managementCompanyMemberKeys.all, 'paginated', companyId, query] as const,
  myCompanyPaginated: (companyId: string, query: TManagementCompanyMembersQuery) =>
    [...managementCompanyMemberKeys.all, 'my-company-paginated', companyId, query] as const,
  details: () => [...managementCompanyMemberKeys.all, 'detail'] as const,
  detail: (id: string) => [...managementCompanyMemberKeys.details(), id] as const,
  primaryAdmin: (companyId: string) =>
    [...managementCompanyMemberKeys.all, 'primary-admin', companyId] as const,
  auditLogs: (memberId: string) =>
    [...managementCompanyMemberKeys.all, 'audit-logs', memberId] as const,
  auditLogsPaginated: (memberId: string, query: Record<string, unknown>) =>
    [...managementCompanyMemberKeys.all, 'audit-logs-paginated', memberId, query] as const,
  auditLogDetail: (logId: string) =>
    [...managementCompanyMemberKeys.all, 'audit-log-detail', logId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUseManagementCompanyMembersOptions {
  enabled?: boolean
}

export interface IUseManagementCompanyMembersPaginatedOptions {
  companyId: string
  query: TManagementCompanyMembersQuery
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
 * @deprecated Use useManagementCompanyMembersPaginated instead
 */
export function useManagementCompanyMembers(
  companyId: string,
  options?: IUseManagementCompanyMembersOptions
) {
  return useApiQuery<TApiDataResponse<TManagementCompanyMember[]>>({
    path: `/platform/management-companies/${companyId}/members`,
    queryKey: managementCompanyMemberKeys.list(companyId),
    config: {},
    enabled: options?.enabled !== false && !!companyId,
  })
}

/**
 * Hook to fetch members of a management company with pagination and filtering
 */
export function useManagementCompanyMembersPaginated(
  options: IUseManagementCompanyMembersPaginatedOptions
) {
  const { companyId, query, enabled = true } = options

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.roleName) params.set('roleName', query.roleName)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/platform/management-companies/${companyId}/members${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TManagementCompanyMember>>({
    path,
    queryKey: managementCompanyMemberKeys.paginated(companyId, query),
    enabled: enabled && !!companyId,
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
    `/platform/management-companies/${companyId}/members`
  )

  return response.data.data
}

/**
 * Standalone function to fetch members with pagination
 */
export async function getManagementCompanyMembersPaginated(
  companyId: string,
  query: TManagementCompanyMembersQuery
): Promise<TApiPaginatedResponse<TManagementCompanyMember>> {
  const client = getHttpClient()

  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.roleName) params.set('roleName', query.roleName)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))

  const queryString = params.toString()
  const path = `/platform/management-companies/${companyId}/members${queryString ? `?${queryString}` : ''}`

  const response = await client.get<TApiPaginatedResponse<TManagementCompanyMember>>(path)

  return response.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - My Company Members (for management company admins)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch members of the authenticated user's own management company.
 * Uses the /me/members endpoint which requires admin role.
 */
export function useMyCompanyMembersPaginated(
  options: IUseManagementCompanyMembersPaginatedOptions
) {
  const { companyId, query, enabled = true } = options

  // Build query string
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.roleName) params.set('roleName', query.roleName)
  if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
  if (query.condominiumId) params.set('condominiumId', query.condominiumId)

  const queryString = params.toString()
  const path = `/platform/management-companies/${companyId}/me/members${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TManagementCompanyMember>>({
    path,
    queryKey: managementCompanyMemberKeys.myCompanyPaginated(companyId, query),
    enabled: enabled && !!companyId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Primary Admin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch the primary admin of a management company
 */
export function usePrimaryAdmin(companyId: string, options?: IUsePrimaryAdminOptions) {
  return useApiQuery<TApiDataResponse<TManagementCompanyMember>>({
    path: `/platform/management-companies/${companyId}/primary-admin`,
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
    `/platform/management-companies/${companyId}/primary-admin`
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
  return useApiMutation<TApiDataResponse<TManagementCompanyMember>, IAddMemberRequest>({
    path: `/platform/management-companies/${companyId}/members`,
    method: 'POST',
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
 * Standalone function to add a member
 */
export async function addMember(
  companyId: string,
  data: IAddMemberRequest
): Promise<TManagementCompanyMember> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TManagementCompanyMember>>(
    `/platform/management-companies/${companyId}/members`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Invite Member (for management company admins via /me/ endpoint)
// ─────────────────────────────────────────────────────────────────────────────

export interface IInviteMemberRequest {
  email: string
  firstName?: string
  lastName?: string
  phoneCountryCode?: string
  phoneNumber?: string
  idDocumentType?: 'J' | 'G' | 'V' | 'E' | 'P'
  idDocumentNumber?: string
  memberRole: 'admin' | 'accountant' | 'support' | 'viewer'
}

export interface IInviteMemberOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * Hook to invite a new member to the authenticated user's own management company.
 * Creates or finds the user, adds them as an inactive member, and sends an invitation email.
 */
export function useMyCompanyInviteMember(companyId: string, options?: IInviteMemberOptions) {
  return useApiMutation<TApiDataResponse<TManagementCompanyMember>, IInviteMemberRequest>({
    path: `/platform/management-companies/${companyId}/me/members/invite`,
    method: 'POST',
    config: {},
    onSuccess: () => options?.onSuccess?.(),
    onError: options?.onError,
    invalidateKeys: [
      managementCompanyMemberKeys.list(companyId),
      managementCompanyMemberKeys.myCompanyPaginated(companyId, {}),
      ['management-companies', companyId, 'me', 'can-create', 'user'],
    ],
  })
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
      path: `/platform/management-company-members/${memberId}`,
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
    `/platform/management-company-members/${memberId}`,
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
    path: `/platform/management-company-members/${memberId}/permissions`,
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
    `/platform/management-company-members/${memberId}/permissions`,
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
    path: `/platform/management-company-members/${memberId}`,
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
  await client.delete<TApiDataResponse<void>>(`/platform/management-company-members/${memberId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Types - Member Detail
// ─────────────────────────────────────────────────────────────────────────────

export type TMemberDetailUser = {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  isEmailVerified: boolean
  isActive: boolean
  phoneCountryCode: string | null
  phoneNumber: string | null
  idDocumentType: string | null
  idDocumentNumber: string | null
  lastLogin: Date | null
}

export type TMemberDetailRelatedUser = {
  id: string
  displayName: string | null
  email: string
}

export type TMemberDetail = Omit<TManagementCompanyMember, 'user' | 'invitedByUser' | 'deactivatedByUser' | 'managementCompany'> & {
  user: TMemberDetailUser | null
  invitedByUser: TMemberDetailRelatedUser | null
  deactivatedByUser: TMemberDetailRelatedUser | null
}

export type TAuditLogEntry = {
  id: string
  tableName: string
  recordId: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  changedFields: string[] | null
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - My Company Member Detail
// ─────────────────────────────────────────────────────────────────────────────

export function useMyCompanyMemberDetail(
  companyId: string,
  memberId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<TMemberDetail>>({
    path: `/platform/management-companies/${companyId}/me/members/${memberId}`,
    queryKey: managementCompanyMemberKeys.detail(memberId),
    enabled: (options?.enabled !== false) && !!companyId && !!memberId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - My Company Member Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

export function useMyCompanyMemberAuditLogs(
  companyId: string,
  memberId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<TAuditLogEntry[]>>({
    path: `/platform/management-companies/${companyId}/me/members/${memberId}/audit-logs`,
    queryKey: managementCompanyMemberKeys.auditLogs(memberId),
    enabled: (options?.enabled !== false) && !!companyId && !!memberId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - My Company Member Actions (admin-scoped /me/ endpoints)
// ─────────────────────────────────────────────────────────────────────────────

export function useMyCompanyUpdateMemberRole(
  companyId: string,
  memberId: string,
  options?: { onSuccess?: () => void; onError?: (error: Error) => void }
) {
  return useApiMutation<TApiDataResponse<TManagementCompanyMember>, { role: TMemberRole }>({
    path: `/platform/management-companies/${companyId}/me/members/${memberId}/role`,
    method: 'PATCH',
    config: {},
    onSuccess: () => options?.onSuccess?.(),
    onError: options?.onError,
    invalidateKeys: [
      managementCompanyMemberKeys.detail(memberId),
      managementCompanyMemberKeys.myCompanyPaginated(companyId, {}),
    ],
  })
}

export function useMyCompanyDeactivateMember(
  companyId: string,
  memberId: string,
  options?: { onSuccess?: () => void; onError?: (error: Error) => void }
) {
  return useApiMutation<TApiDataResponse<TManagementCompanyMember>, void>({
    path: `/platform/management-companies/${companyId}/me/members/${memberId}/deactivate`,
    method: 'POST',
    config: {},
    onSuccess: () => options?.onSuccess?.(),
    onError: options?.onError,
    invalidateKeys: [
      managementCompanyMemberKeys.detail(memberId),
      managementCompanyMemberKeys.myCompanyPaginated(companyId, {}),
    ],
  })
}

export function useMyCompanyReactivateMember(
  companyId: string,
  memberId: string,
  options?: { onSuccess?: () => void; onError?: (error: Error) => void }
) {
  return useApiMutation<TApiDataResponse<TManagementCompanyMember>, void>({
    path: `/platform/management-companies/${companyId}/me/members/${memberId}/reactivate`,
    method: 'POST',
    config: {},
    onSuccess: () => options?.onSuccess?.(),
    onError: options?.onError,
    invalidateKeys: [
      managementCompanyMemberKeys.detail(memberId),
      managementCompanyMemberKeys.myCompanyPaginated(companyId, {}),
    ],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - My Company Member Audit Logs (Paginated)
// ─────────────────────────────────────────────────────────────────────────────

export interface IMemberAuditLogsQuery {
  page?: number
  limit?: number
  action?: 'INSERT' | 'UPDATE' | 'DELETE'
  dateFrom?: string
  dateTo?: string
}

export function useMyCompanyMemberAuditLogsPaginated(
  companyId: string,
  memberId: string,
  query: IMemberAuditLogsQuery = {},
  options?: { enabled?: boolean }
) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.action) params.set('action', query.action)
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)

  const queryString = params.toString()
  const path = `/platform/management-companies/${companyId}/me/members/${memberId}/audit-logs/paginated${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TAuditLogEntry>>({
    path,
    queryKey: managementCompanyMemberKeys.auditLogsPaginated(memberId, { ...query }),
    enabled: (options?.enabled !== false) && !!companyId && !!memberId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - My Company Member Audit Log Detail
// ─────────────────────────────────────────────────────────────────────────────

export function useMyCompanyMemberAuditLogDetail(
  companyId: string,
  memberId: string,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery<TApiDataResponse<TAuditLogEntry>>({
    path: `/platform/management-companies/${companyId}/me/members/${memberId}/audit-logs/${logId}`,
    queryKey: managementCompanyMemberKeys.auditLogDetail(logId),
    enabled: (options?.enabled !== false) && !!companyId && !!memberId && !!logId,
  })
}
