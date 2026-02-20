import type { TNotification, TPaginatedResponse } from '@packages/domain'
import type { TApiDataResponse } from '../types'
import type { ApiResponse } from '../types/http'

import { useApiQuery, useApiMutation } from './use-api-query'
import { useQueryClient } from '@tanstack/react-query'

// Query keys for notifications
export const notificationsKeys = {
  all: ['notifications'] as const,
  mine: ['my-notifications'] as const,
  mineFiltered: (filters: Record<string, unknown>) =>
    [...notificationsKeys.mine, filters] as const,
  unreadCount: (userId?: string) =>
    ['notifications', 'unread-count', userId] as const,
}

// ============================================================================
// Paginated Query Hook
// ============================================================================

export interface UseMyNotificationsPaginatedOptions {
  page?: number
  limit?: number
  category?: string
  isRead?: boolean
  enabled?: boolean
}

/**
 * Hook to get the current user's notifications (paginated with filters).
 */
export function useMyNotificationsPaginated(options: UseMyNotificationsPaginatedOptions = {}) {
  const { page = 1, limit = 20, category, isRead, enabled = true } = options

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (category) params.set('category', category)
  if (isRead !== undefined) params.set('isRead', String(isRead))

  const path = `/me/notifications/paginated?${params.toString()}`

  return useApiQuery<TPaginatedResponse<TNotification>>({
    path,
    queryKey: notificationsKeys.mineFiltered({ page, limit, category, isRead }),
    enabled,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export interface UseMarkNotificationAsReadOptions {
  userId?: string
  onSuccess?: () => void
}

/**
 * Hook to mark a single notification as read.
 */
export function useMarkNotificationAsRead(options: UseMarkNotificationAsReadOptions = {}) {
  const queryClient = useQueryClient()

  return useApiMutation<TApiDataResponse<TNotification>, { id: string }>({
    path: (variables: { id: string }) => `/me/notifications/${variables.id}/read`,
    method: 'POST',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all })
      queryClient.invalidateQueries({ queryKey: notificationsKeys.mine })
      if (options.userId) {
        queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount(options.userId) })
      }
      options.onSuccess?.()
    },
  })
}

export interface UseMarkAllNotificationsAsReadOptions {
  userId?: string
  onSuccess?: () => void
}

/**
 * Hook to mark all notifications as read.
 */
export function useMarkAllNotificationsAsRead(options: UseMarkAllNotificationsAsReadOptions = {}) {
  const queryClient = useQueryClient()

  return useApiMutation<TApiDataResponse<{ count: number }>, void>({
    path: '/me/notifications/read-all',
    method: 'POST',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all })
      queryClient.invalidateQueries({ queryKey: notificationsKeys.mine })
      if (options.userId) {
        queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount(options.userId) })
      }
      options.onSuccess?.()
    },
  })
}

export interface UseDeleteNotificationOptions {
  userId?: string
  onSuccess?: () => void
}

/**
 * Hook to delete a notification.
 */
export function useDeleteNotification(options: UseDeleteNotificationOptions = {}) {
  const queryClient = useQueryClient()

  return useApiMutation<TApiDataResponse<{ success: boolean }>, { id: string }>({
    path: (variables: { id: string }) => `/me/notifications/${variables.id}`,
    method: 'DELETE',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all })
      queryClient.invalidateQueries({ queryKey: notificationsKeys.mine })
      if (options.userId) {
        queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount(options.userId) })
      }
      options.onSuccess?.()
    },
  })
}
