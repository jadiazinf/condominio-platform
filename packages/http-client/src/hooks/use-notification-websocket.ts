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
 */
export function useNotificationWebSocket({
  token,
  enabled = true,
  wsUrl,
}: IUseNotificationWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const tokenRef = useRef(token)
  const enabledRef = useRef(enabled)
  const wsUrlRef = useRef(wsUrl)
  const connectingRef = useRef(false)
  const queryClient = useQueryClient()
  const queryClientRef = useRef(queryClient)

  // Keep refs in sync
  tokenRef.current = token
  enabledRef.current = enabled
  wsUrlRef.current = wsUrl
  queryClientRef.current = queryClient

  const MAX_RECONNECT_ATTEMPTS = 3
  const RECONNECT_DELAY = 3000

  const connect = useCallback(() => {
    const currentToken = tokenRef.current

    if (!enabledRef.current || !currentToken) return
    if (connectingRef.current) return
    connectingRef.current = true

    // Close existing connection
    if (wsRef.current) {
      const { readyState } = wsRef.current
      if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Reconnecting')
      }
      wsRef.current = null
    }

    try {
      let finalWsUrl: string
      const currentWsUrl = wsUrlRef.current

      if (currentWsUrl) {
        finalWsUrl = `${currentWsUrl}/notifications?token=${currentToken}`
      } else {
        const isClient = typeof globalThis !== 'undefined' && 'window' in globalThis
        if (!isClient) {
          connectingRef.current = false
          return
        }

        const config = getEnvConfig()
        const apiUrl = new URL(config.apiBaseUrl)
        const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = apiUrl.host

        finalWsUrl = `${wsProtocol}//${wsHost}/api/ws/notifications?token=${currentToken}`
      }

      const ws = new WebSocket(finalWsUrl)

      ws.onopen = () => {
        connectingRef.current = false
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = event => {
        try {
          const message: IWebSocketMessage = JSON.parse(event.data)
          const qc = queryClientRef.current

          if (message.event === 'new_notification') {
            const { notification, unreadCount } = message.data as INewNotificationData

            qc.setQueryData(['notifications'], (old: { data: TNotification[] } | undefined) => {
              if (!old?.data) return old
              const exists = old.data.some(n => n.id === notification.id)
              if (exists) return old
              return { ...old, data: [notification, ...old.data] }
            })

            qc.setQueriesData(
              { queryKey: ['notifications'], exact: false },
              (old: { data: TNotification[] } | undefined) => {
                if (!old?.data || !Array.isArray(old.data)) return old
                const exists = old.data.some(n => n.id === notification.id)
                if (exists) return old
                return { ...old, data: [notification, ...old.data] }
              }
            )

            qc.setQueriesData(
              { queryKey: ['notifications', 'unread-count'], exact: false },
              () => ({ data: { count: unreadCount } })
            )
          }
        } catch {
          // Silently ignore parse errors
        }
      }

      ws.onerror = () => {
        setError('WebSocket connection error')
      }

      ws.onclose = event => {
        connectingRef.current = false
        setIsConnected(false)

        console.log('[WS] onclose code:', event.code, 'reason:', event.reason)

        // Auth failure (1008) — stop completely, no reconnection
        if (event.code === 1008) {
          setError(event.reason || 'Authentication failed')
          return
        }

        // Normal closure — no reconnection needed
        if (event.code === 1000) return

        // Network/server issues — retry with limit
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY)
        } else {
          setError('Max reconnection attempts reached')
        }
      }

      wsRef.current = ws
    } catch {
      connectingRef.current = false
      setError('Failed to connect to WebSocket')
    }
  }, [])

  const disconnect = useCallback(() => {
    connectingRef.current = false

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

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    isConnected,
    error,
    reconnect: connect,
  }
}
