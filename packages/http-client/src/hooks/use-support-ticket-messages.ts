import { useApiMutation, useApiQuery } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import type { TApiDataResponse } from '../types/api-responses'
import type { ApiResponse } from '../types/http'
import type { TSupportTicketMessage, TSupportTicketMessageCreate } from '@packages/domain'
import { supportTicketKeys } from './use-support-tickets'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const supportTicketMessageKeys = {
  all: ['support-ticket-messages'] as const,
  lists: () => [...supportTicketMessageKeys.all, 'list'] as const,
  list: (ticketId: string) => [...supportTicketMessageKeys.lists(), ticketId] as const,
  details: () => [...supportTicketMessageKeys.all, 'detail'] as const,
  detail: (id: string) => [...supportTicketMessageKeys.details(), id] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type for creating a message from the client.
 * Omits ticketId and userId as they are handled by the API automatically.
 */
export type TCreateTicketMessageInput = Omit<TSupportTicketMessageCreate, 'ticketId' | 'userId'>

export interface IUseTicketMessagesOptions {
  enabled?: boolean
}

export interface ICreateTicketMessageOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<TSupportTicketMessage>>) => void
  onError?: (error: Error) => void
}

export interface IDeleteTicketMessageOptions {
  onSuccess?: (data: ApiResponse<TApiDataResponse<void>>) => void
  onError?: (error: Error) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks - List Messages by Ticket
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch all messages for a support ticket
 */
export function useTicketMessages(ticketId: string, options?: IUseTicketMessagesOptions) {
  return useApiQuery<TApiDataResponse<TSupportTicketMessage[]>>({
    path: `/platform/support-tickets/${ticketId}/messages`,
    queryKey: supportTicketMessageKeys.list(ticketId),
    config: {},
    enabled: options?.enabled !== false && !!ticketId,
  })
}

/**
 * Standalone function to fetch ticket messages
 */
export async function getTicketMessages(ticketId: string): Promise<TSupportTicketMessage[]> {
  const client = getHttpClient()
  const response = await client.get<TApiDataResponse<TSupportTicketMessage[]>>(
    `/platform/support-tickets/${ticketId}/messages`
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Create Message
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to create a new message in a ticket.
 * Note: ticketId and userId are handled automatically by the API.
 */
export function useCreateTicketMessage(ticketId: string, options?: ICreateTicketMessageOptions) {
  return useApiMutation<TApiDataResponse<TSupportTicketMessage>, TCreateTicketMessageInput>({
    path: `/platform/support-tickets/${ticketId}/messages`,
    method: 'POST',
    config: {},
    onSuccess: (response) => {
      // Optimistically update the cache with the new message
      const newMessage = response.data.data

      // This will be handled by WebSocket, but we update cache as backup
      // The WebSocket handler will check for duplicates

      options?.onSuccess?.(response)
    },
    onError: options?.onError,
    invalidateKeys: [
      supportTicketMessageKeys.list(ticketId),
      supportTicketKeys.detail(ticketId), // Also invalidate ticket to update last message time
    ],
  })
}

/**
 * Standalone function to create a ticket message.
 * Note: ticketId and userId are handled automatically by the API.
 */
export async function createTicketMessage(
  ticketId: string,
  data: TCreateTicketMessageInput
): Promise<TSupportTicketMessage> {
  const client = getHttpClient()
  const response = await client.post<TApiDataResponse<TSupportTicketMessage>>(
    `/platform/support-tickets/${ticketId}/messages`,
    data
  )

  return response.data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Delete Message
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to delete a ticket message
 */
export function useDeleteTicketMessage(
  messageId: string,
  ticketId: string,
  options?: IDeleteTicketMessageOptions
) {
  return useApiMutation<TApiDataResponse<void>, void>({
    path: `/platform/support-ticket-messages/${messageId}`,
    method: 'DELETE',
    config: {},
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    invalidateKeys: [supportTicketMessageKeys.list(ticketId)],
  })
}

/**
 * Standalone function to delete a ticket message
 */
export async function deleteTicketMessage(messageId: string): Promise<void> {
  const client = getHttpClient()
  await client.delete<TApiDataResponse<void>>(`/platform/support-ticket-messages/${messageId}`)
}
