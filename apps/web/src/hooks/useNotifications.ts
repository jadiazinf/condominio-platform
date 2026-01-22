'use client'

import type { TNotification } from '@packages/domain'
import type { TApiDataResponse } from '@packages/http-client'

import { useApiQuery, useApiMutation, useQueryClient } from '@packages/http-client'

import { useUser } from '@/contexts'

export interface UseNotificationsOptions {
  enabled?: boolean
}

export interface UnreadCountResponse {
  count: number
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const userId = user?.id

  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useApiQuery<TApiDataResponse<TNotification[]>>({
    path: `/notifications/user/${userId}`,
    queryKey: ['notifications', userId],
    enabled: !!userId && options.enabled !== false,
  })

  const { data: unreadCountData, refetch: refetchUnreadCount } =
    useApiQuery<TApiDataResponse<UnreadCountResponse>>({
      path: `/notifications/user/${userId}/unread-count`,
      queryKey: ['notifications', 'unread-count', userId],
      enabled: !!userId && options.enabled !== false,
    })

  const { mutateAsync: markAsReadMutation } = useApiMutation<TApiDataResponse<TNotification>, { id: string }>({
    path: variables => `/notifications/${variables.id}/read`,
    method: 'POST',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] })
    },
  })

  const { mutateAsync: markAllAsReadMutation } = useApiMutation<TApiDataResponse<{ count: number }>, void>({
    path: `/notifications/user/${userId}/read-all`,
    method: 'POST',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] })
    },
  })

  const { mutateAsync: deleteNotificationMutation } = useApiMutation<TApiDataResponse<void>, { id: string }>({
    path: variables => `/notifications/${variables.id}`,
    method: 'DELETE',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] })
    },
  })

  const notifications = notificationsData?.data ?? []
  const unreadCount = unreadCountData?.data?.count ?? 0

  async function markAsRead(notificationId: string) {
    await markAsReadMutation({ id: notificationId })
  }

  async function markAllAsRead() {
    await markAllAsReadMutation()
  }

  async function deleteNotification(notificationId: string) {
    await deleteNotificationMutation({ id: notificationId })
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    refetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
