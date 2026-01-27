import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type {
  TSupportTicket,
  TSupportTicketCreate,
  TSupportTicketUpdate,
  TTicketPriority,
  TTicketStatus,
} from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const supportTicketKeys = {
  all: ['support-tickets'] as const,
  lists: () => [...supportTicketKeys.all, 'list'] as const,
  list: (companyId: string, filters?: ITicketFilters) =>
    [...supportTicketKeys.lists(), companyId, filters] as const,
  details: () => [...supportTicketKeys.all, 'detail'] as const,
  detail: (id: string) => [...supportTicketKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ITicketFilters {
  status?: TTicketStatus
  priority?: TTicketPriority
  assignedTo?: string
  search?: string
  page?: number
  limit?: number
}

export interface IUseSupportTicketsOptions {
  enabled?: boolean
  filters?: ITicketFilters
}

export interface IUseSupportTicketOptions {
  enabled?: boolean
}

export interface ICreateTicketOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateTicketOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
  onError?: (error: Error) => void
}

export interface IAssignTicketOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
  onError?: (error: Error) => void
}

export interface IResolveTicketOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
  onError?: (error: Error) => void
}

export interface ICloseTicketOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
  onError?: (error: Error) => void
}

export interface IUpdateTicketStatusOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
  onError?: (error: Error) => void
}

export interface IAssignTicketData {
  assignedTo: string
}

export interface IResolveTicketData {
  resolvedBy: string
}

export interface ICloseTicketData {
  closedBy: string
}

export interface IUpdateTicketStatusData {
  status: TTicketStatus
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List All Tickets (Superadmin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch all support tickets across all companies (superadmin only)
 */
export function useAllSupportTickets(options?: IUseSupportTicketsOptions) {
  const filters = options?.filters

  // Build query string
  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.priority) queryParams.set('priority', filters.priority)
  if (filters?.assignedTo) queryParams.set('assignedTo', filters.assignedTo)
  if (filters?.search) queryParams.set('search', filters.search)
  if (filters?.page) queryParams.set('page', filters.page.toString())
  if (filters?.limit) queryParams.set('limit', filters.limit.toString())

  const queryString = queryParams.toString()
  const path = `/support-tickets${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TSupportTicket>>({
    path,
    queryKey: supportTicketKeys.list('all', filters),
    config: {},
    enabled: options?.enabled !== false,
  })
}

/**
 * Standalone function to fetch all tickets
 */
export async function getAllSupportTickets(filters?: ITicketFilters, token?: string): Promise<TApiPaginatedResponse<TSupportTicket>> {
  const client = getHttpClient()
  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.priority) queryParams.set('priority', filters.priority)
  if (filters?.assignedTo) queryParams.set('assignedTo', filters.assignedTo)
  if (filters?.search) queryParams.set('search', filters.search)
  if (filters?.page) queryParams.set('page', filters.page.toString())
  if (filters?.limit) queryParams.set('limit', filters.limit.toString())

  const queryString = queryParams.toString()
  const url = `/support-tickets${queryString ? `?${queryString}` : ''}`

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await client.get<TApiPaginatedResponse<TSupportTicket>>(url, { headers })

  return response.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Tickets by Company
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch support tickets for a management company
 */
export function useSupportTickets(companyId: string, options?: IUseSupportTicketsOptions) {
  const filters = options?.filters

  // Build query string
  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.priority) queryParams.set('priority', filters.priority)
  if (filters?.assignedTo) queryParams.set('assignedTo', filters.assignedTo)
  if (filters?.search) queryParams.set('search', filters.search)
  if (filters?.page) queryParams.set('page', filters.page.toString())
  if (filters?.limit) queryParams.set('limit', filters.limit.toString())

  const queryString = queryParams.toString()
  const path = `/management-companies/${companyId}/tickets${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TSupportTicket>>({
    path,
    queryKey: supportTicketKeys.list(companyId, filters),
    config: {},
    enabled: options?.enabled !== false && !!companyId,
  })
}

/**
 * Standalone function to fetch tickets
 */
export async function getSupportTickets(
  companyId: string,
  filters?: ITicketFilters,
  token?: string
): Promise<TApiPaginatedResponse<TSupportTicket>> {
  const client = getHttpClient()
  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.priority) queryParams.set('priority', filters.priority)
  if (filters?.assignedTo) queryParams.set('assignedTo', filters.assignedTo)
  if (filters?.search) queryParams.set('search', filters.search)
  if (filters?.page) queryParams.set('page', filters.page.toString())
  if (filters?.limit) queryParams.set('limit', filters.limit.toString())

  const queryString = queryParams.toString()
  const url = `/management-companies/${companyId}/tickets${queryString ? `?${queryString}` : ''}`

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await client.get<TApiPaginatedResponse<TSupportTicket>>(url, { headers })

  return response.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Get Ticket by ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch a specific ticket by ID
 */
export function useSupportTicket(ticketId: string, options?: IUseSupportTicketOptions) {
  return useApiQuery<TApiDataResponse<TSupportTicket>>({
    path: `/support-tickets/${ticketId}`,
    queryKey: supportTicketKeys.detail(ticketId),
    config: {},
    enabled: options?.enabled !== false && !!ticketId,
  })
}

/**
 * Standalone function to fetch a ticket by ID
 */
export async function getSupportTicket(ticketId: string, token?: string): Promise<TSupportTicket> {
  const client = getHttpClient()

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await client.get<TApiDataResponse<TSupportTicket>>(
    `/support-tickets/${ticketId}`,
    { headers }
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Ticket
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to create a new support ticket
 */
export function useCreateTicket(companyId: string, options?: ICreateTicketOptions) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, TSupportTicketCreate>({
    path: `/management-companies/${companyId}/tickets`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [supportTicketKeys.list(companyId)],
  })
}

/**
 * Standalone function to create a ticket
 */
export async function createTicket(
  companyId: string,
  data: TSupportTicketCreate
): Promise<TSupportTicket> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TSupportTicket>>(
    `/management-companies/${companyId}/tickets`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Ticket
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to update a ticket
 */
export function useUpdateTicket(
  ticketId: string,
  companyId: string,
  options?: IUpdateTicketOptions
) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, TSupportTicketUpdate>({
    path: `/support-tickets/${ticketId}`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [supportTicketKeys.detail(ticketId), supportTicketKeys.list(companyId)],
  })
}

/**
 * Standalone function to update a ticket
 */
export async function updateTicket(
  ticketId: string,
  data: TSupportTicketUpdate
): Promise<TSupportTicket> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TSupportTicket>>(
    `/support-tickets/${ticketId}`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Assign Ticket
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to assign a ticket to a support agent
 */
export function useAssignTicket(
  ticketId: string,
  companyId: string,
  options?: IAssignTicketOptions
) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, IAssignTicketData>({
    path: `/support-tickets/${ticketId}/assign`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [supportTicketKeys.detail(ticketId), supportTicketKeys.list(companyId)],
  })
}

/**
 * Standalone function to assign a ticket
 */
export async function assignTicket(ticketId: string, assignedTo: string): Promise<TSupportTicket> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TSupportTicket>>(
    `/support-tickets/${ticketId}/assign`,
    { assignedTo }
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Resolve Ticket
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to resolve a ticket
 */
export function useResolveTicket(
  ticketId: string,
  companyId: string,
  options?: IResolveTicketOptions
) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, IResolveTicketData>({
    path: `/support-tickets/${ticketId}/resolve`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [supportTicketKeys.detail(ticketId), supportTicketKeys.list(companyId)],
  })
}

/**
 * Standalone function to resolve a ticket
 */
export async function resolveTicket(ticketId: string, resolvedBy: string): Promise<TSupportTicket> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TSupportTicket>>(
    `/support-tickets/${ticketId}/resolve`,
    { resolvedBy }
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Close Ticket
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to close a ticket
 */
export function useCloseTicket(ticketId: string, companyId: string, options?: ICloseTicketOptions) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, ICloseTicketData>({
    path: `/support-tickets/${ticketId}/close`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [supportTicketKeys.detail(ticketId), supportTicketKeys.list(companyId)],
  })
}

/**
 * Standalone function to close a ticket
 */
export async function closeTicket(ticketId: string, closedBy: string): Promise<TSupportTicket> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TSupportTicket>>(
    `/support-tickets/${ticketId}/close`,
    { closedBy }
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Update Ticket Status
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to update ticket status
 */
export function useUpdateTicketStatus(
  ticketId: string,
  companyId: string,
  options?: IUpdateTicketStatusOptions
) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, IUpdateTicketStatusData>({
    path: `/support-tickets/${ticketId}/status`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [supportTicketKeys.detail(ticketId), supportTicketKeys.list(companyId)],
  })
}

/**
 * Standalone function to update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: TTicketStatus
): Promise<TSupportTicket> {
  const client = getHttpClient()
  const response = await client.patch<TApiDataResponse<TSupportTicket>>(
    `/support-tickets/${ticketId}/status`,
    { status }
  )

  return response.data.data
}
