'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { TSupportTicketMessage } from '@packages/domain'
import { useQueryClient } from '@tanstack/react-query'
import { supportTicketMessageKeys } from './use-support-ticket-messages'
import { getEnvConfig } from '../config/env'

interface IWebSocketMessage {
  event: string
  data: unknown
}

interface IUseTicketWebSocketOptions {
  ticketId: string
  token: string
  enabled?: boolean
  wsUrl?: string
}

/**
 * Hook to connect to WebSocket for real-time ticket message updates
 *
 * @param options.ticketId - The ticket ID to subscribe to
 * @param options.token - The Firebase authentication token
 * @param options.enabled - Whether the WebSocket connection is enabled
 * @param options.wsUrl - Optional custom WebSocket URL (defaults to ws://localhost:3001 in dev)
 */
export function useTicketWebSocket({
  ticketId,
  token,
  enabled = true,
  wsUrl,
}: IUseTicketWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const queryClient = useQueryClient()

  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000 // 3 seconds

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
      // Determine WebSocket URL
      let finalWsUrl: string

      if (wsUrl) {
        finalWsUrl = `${wsUrl}/tickets/${ticketId}?token=${token}`
      } else {
        // Check if running in browser environment
        const isClient = typeof globalThis !== 'undefined' && 'window' in globalThis
        if (!isClient) {
          return // Don't connect on server
        }

        const config = getEnvConfig()
        const apiUrl = new URL(config.apiBaseUrl)
        const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = apiUrl.host

        finalWsUrl = `${wsProtocol}//${wsHost}/api/ws/tickets/${ticketId}?token=${token}`
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

          if (message.event === 'new_message') {
            const newMessage = message.data as TSupportTicketMessage

            // Update React Query cache
            queryClient.setQueryData(
              supportTicketMessageKeys.list(ticketId),
              (old: { data: TSupportTicketMessage[] } | undefined) => {
                if (!old?.data) {
                  return old
                }

                // Check if message already exists (avoid duplicates)
                const exists = old.data.some((msg) => msg.id === newMessage.id)

                if (exists) {
                  return old
                }

                return {
                  ...old,
                  data: [...old.data, newMessage],
                }
              }
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
  }, [ticketId, token, enabled, wsUrl, queryClient])

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
