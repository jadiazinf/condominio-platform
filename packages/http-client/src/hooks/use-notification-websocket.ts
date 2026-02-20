'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { TNotification } from '@packages/domain'
import { useQueryClient } from '@tanstack/react-query'
import { getEnvConfig } from '../config/env'

interface IWebSocketMessage {
  event: string
  data: unknown
}

interface INewNotificationData {
  notification: TNotification
  unreadCount: number
}

interface IUseNotificationWebSocketOptions {
  token: string
  enabled?: boolean
  wsUrl?: string
}

/**
 * Hook to connect to WebSocket for real-time notification updates
 *
 * @param options.token - The Firebase authentication token
 * @param options.enabled - Whether the WebSocket connection is enabled
 * @param options.wsUrl - Optional custom WebSocket URL
 */
export function useNotificationWebSocket({
  token,
  enabled = true,
  wsUrl,
}: IUseNotificationWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const queryClient = useQueryClient()

  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  const connect = useCallback(() => {
    if (!enabled || !token) {
      if (!token) setError('No authentication token')
      return
    }

    // Close existing connection before creating a new one
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Reconnecting')
      wsRef.current = null
    }

    try {
      let finalWsUrl: string

      if (wsUrl) {
        finalWsUrl = `${wsUrl}/notifications?token=${token}`
      } else {
        const isClient = typeof globalThis !== 'undefined' && 'window' in globalThis
        if (!isClient) {
          return // Don't connect on server
        }

        const config = getEnvConfig()
        const apiUrl = new URL(config.apiBaseUrl)
        const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = apiUrl.host

        finalWsUrl = `${wsProtocol}//${wsHost}/api/ws/notifications?token=${token}`
      }

      const ws = new WebSocket(finalWsUrl)

      ws.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: IWebSocketMessage = JSON.parse(event.data)

          if (message.event === 'new_notification') {
            const { notification, unreadCount } = message.data as INewNotificationData

            // Update notifications list cache (prepend new notification)
            queryClient.setQueryData(
              ['notifications'],
              (old: { data: TNotification[] } | undefined) => {
                if (!old?.data) return old

                // Deduplicate
                const exists = old.data.some(n => n.id === notification.id)
                if (exists) return old

                return {
                  ...old,
                  data: [notification, ...old.data],
                }
              }
            )

            // Also try with userId-scoped key (used by useNotifications)
            queryClient.setQueriesData(
              { queryKey: ['notifications'], exact: false },
              (old: { data: TNotification[] } | undefined) => {
                if (!old?.data || !Array.isArray(old.data)) return old

                const exists = old.data.some(n => n.id === notification.id)
                if (exists) return old

                return {
                  ...old,
                  data: [notification, ...old.data],
                }
              }
            )

            // Update unread count cache
            queryClient.setQueriesData(
              { queryKey: ['notifications', 'unread-count'], exact: false },
              () => ({
                data: { count: unreadCount },
              })
            )
          } else if (message.event === 'error') {
            setError(message.data as string)
          }
        } catch {
          // Silently ignore parse errors
        }
      }

      ws.onerror = () => {
        setError('WebSocket connection error')
      }

      ws.onclose = (event) => {
        setIsConnected(false)

        // Attempt reconnection if not a normal closure and under max attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY)
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Max reconnection attempts reached')
        }
      }

      wsRef.current = ws
    } catch {
      setError('Failed to connect to WebSocket')
    }
  }, [token, enabled, wsUrl, queryClient])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounted')
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    error,
    reconnect: connect,
  }
}
