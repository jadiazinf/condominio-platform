'use client'

import type { TNotification } from '@packages/domain'
import type { TApiDataResponse } from '@packages/http-client'

import { useState, useEffect } from 'react'
import { useApiQuery, useApiMutation, useQueryClient } from '@packages/http-client'
import { useNotificationWebSocket } from '@packages/http-client/hooks'

import { useUser, useAuth } from '@/contexts'
import { getSessionCookie, setSessionCookie } from '@/libs/cookies'

export interface UseNotificationsOptions {
  enabled?: boolean
}

export interface UnreadCountResponse {
  count: number
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { user } = useUser()
  const { user: firebaseUser } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  // Get auth token for WebSocket connection
  // Always get a fresh token from Firebase to avoid connecting with an expired cookie token
  const [token, setToken] = useState('')
  const [tokenReady, setTokenReady] = useState(false)

  useEffect(() => {
    if (!firebaseUser) return

    // Force refresh to ensure we get a valid token, not a cached expired one
    firebaseUser
      .getIdToken(true)
      .then(freshToken => {
        setToken(freshToken)
        setSessionCookie(firebaseUser)
        setTokenReady(true)
      })
      .catch(() => {
        // Fallback to cookie if Firebase refresh fails
        const cookieToken = getSessionCookie()

        if (cookieToken) {
          setToken(cookieToken)
          setTokenReady(true)
        }
      })
  }, [firebaseUser])

  // Real-time WebSocket connection
  const { isConnected } = useNotificationWebSocket({
    token,
    enabled: !!token && tokenReady && !!userId && options.enabled !== false,
  })

  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useApiQuery<TApiDataResponse<TNotification[]>>({
    path: `/me/notifications`,
    queryKey: ['notifications', userId],
    enabled: !!userId && options.enabled !== false,
    refetchOnWindowFocus: true,
  })

  const { data: unreadCountData, refetch: refetchUnreadCount } = useApiQuery<
    TApiDataResponse<UnreadCountResponse>
  >({
    path: `/me/notifications/unread-count`,
    queryKey: ['notifications', 'unread-count', userId],
    enabled: !!userId && options.enabled !== false,
    refetchOnWindowFocus: true,
  })

  const { mutateAsync: markAsReadMutation } = useApiMutation<
    TApiDataResponse<TNotification>,
    { id: string }
  >({
    path: variables => `/me/notifications/${variables.id}/read`,
    method: 'POST',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] })
    },
  })

  const { mutateAsync: markAllAsReadMutation } = useApiMutation<
    TApiDataResponse<{ count: number }>,
    void
  >({
    path: `/me/notifications/read-all`,
    method: 'POST',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] })
    },
  })

  const { mutateAsync: deleteNotificationMutation } = useApiMutation<
    TApiDataResponse<void>,
    { id: string }
  >({
    path: variables => `/me/notifications/${variables.id}`,
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
    isConnected,
    error,
    refetch,
    refetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
