import { useApiMutation, useApiQuery } from './use-api-query'
import type { TApiDataResponse, TApiPaginatedResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type {
  TSupportTicket,
  TSupportTicketMessage,
  TSupportTicketMessageCreate,
  TTicketChannel,
  TTicketPriority,
  TTicketStatus,
  TTicketCategory,
} from '@packages/domain'
import { supportTicketKeys } from './use-support-tickets'
import { supportTicketMessageKeys } from './use-support-ticket-messages'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const userTicketKeys = {
  all: ['user-tickets'] as const,
  myList: (filters?: IUserTicketFilters) => [...userTicketKeys.all, 'my', filters] as const,
  detail: (ticketId: string) => [...userTicketKeys.all, 'detail', ticketId] as const,
  messages: (ticketId: string) => [...userTicketKeys.all, 'messages', ticketId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IUserTicketFilters {
  status?: TTicketStatus
  priority?: TTicketPriority
  channel?: TTicketChannel
  search?: string
  page?: number
  limit?: number
}

export interface ICreateUserTicketInput {
  channel: TTicketChannel
  subject: string
  description: string
  priority?: TTicketPriority
  category?: TTicketCategory
}

export interface IUseMyTicketsOptions {
  enabled?: boolean
  filters?: IUserTicketFilters
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - My Tickets
// ─────────────────────────────────────────────────────────────────────────────

export function useMyTickets(options?: IUseMyTicketsOptions) {
  const filters = options?.filters

  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.priority) queryParams.set('priority', filters.priority)
  if (filters?.channel) queryParams.set('channel', filters.channel)
  if (filters?.search) queryParams.set('search', filters.search)
  if (filters?.page) queryParams.set('page', filters.page.toString())
  if (filters?.limit) queryParams.set('limit', filters.limit.toString())

  const queryString = queryParams.toString()
  const path = `/tickets/my${queryString ? `?${queryString}` : ''}`

  return useApiQuery<TApiPaginatedResponse<TSupportTicket>>({
    path,
    queryKey: userTicketKeys.myList(filters),
    config: {},
    enabled: options?.enabled !== false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Create Ticket
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateUserTicket(options?: {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
  onError?: (error: Error) => void
}) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, ICreateUserTicketInput>({
    path: '/tickets',
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [userTicketKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Ticket Detail
// ─────────────────────────────────────────────────────────────────────────────

export function useUserTicket(ticketId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TSupportTicket>>({
    path: `/tickets/${ticketId}`,
    queryKey: userTicketKeys.detail(ticketId),
    config: {},
    enabled: options?.enabled !== false && !!ticketId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Ticket Messages
// ─────────────────────────────────────────────────────────────────────────────

export function useUserTicketMessages(ticketId: string, options?: { enabled?: boolean }) {
  return useApiQuery<TApiDataResponse<TSupportTicketMessage[]>>({
    path: `/tickets/${ticketId}/messages`,
    queryKey: userTicketKeys.messages(ticketId),
    config: {},
    enabled: options?.enabled !== false && !!ticketId,
  })
}

export type TCreateUserTicketMessageInput = Omit<TSupportTicketMessageCreate, 'ticketId' | 'userId'>

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Admin Ticket Management (for resident_to_admin tickets)
// ─────────────────────────────────────────────────────────────────────────────

export function useUserUpdateTicketStatus(
  ticketId: string,
  options?: {
    onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
    onError?: (error: Error) => void
  }
) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, { status: TTicketStatus }>({
    path: `/tickets/${ticketId}/status`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [userTicketKeys.detail(ticketId), userTicketKeys.all],
  })
}

export function useUserResolveTicket(
  ticketId: string,
  options?: {
    onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
    onError?: (error: Error) => void
  }
) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, { resolvedBy: string }>({
    path: `/tickets/${ticketId}/resolve`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [userTicketKeys.detail(ticketId), userTicketKeys.all],
  })
}

export function useUserCloseTicket(
  ticketId: string,
  options?: {
    onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicket>>) => void
    onError?: (error: Error) => void
  }
) {
  return useApiMutation<TApiDataResponse<TSupportTicket>, { closedBy: string; solution?: string }>({
    path: `/tickets/${ticketId}/close`,
    method: 'PATCH',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [userTicketKeys.detail(ticketId), userTicketKeys.all],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - Create Message
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateUserTicketMessage(
  ticketId: string,
  options?: {
    onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicketMessage>>) => void
    onError?: (error: Error) => void
  }
) {
  return useApiMutation<TApiDataResponse<TSupportTicketMessage>, TCreateUserTicketMessageInput>({
    path: `/tickets/${ticketId}/messages`,
    method: 'POST',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [
      userTicketKeys.messages(ticketId),
      userTicketKeys.detail(ticketId),
      supportTicketMessageKeys.list(ticketId),
      supportTicketKeys.detail(ticketId),
    ],
  })
}
