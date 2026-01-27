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
    console.log('[WebSocket] Connect attempt - enabled:', enabled, 'hasToken:', !!token, 'ticketId:', ticketId)

    if (!enabled) {
      console.log('[WebSocket] Connection disabled by enabled flag')
      return
    }

    if (!token) {
      console.warn('[WebSocket] No authentication token available, skipping connection')
      setError('No authentication token')
      return
    }

    try {
      // Determine WebSocket URL
      let finalWsUrl: string

      if (wsUrl) {
        // Use provided URL
        finalWsUrl = `${wsUrl}/tickets/${ticketId}?token=${token}`
      } else {
        // Auto-detect based on environment
        const isClient = typeof window !== 'undefined'
        if (!isClient) {
          console.log('[WebSocket] Server-side, skipping WebSocket connection')
          return // Don't connect on server
        }

        // Get API base URL from config
        const config = getEnvConfig()
        const apiUrl = new URL(config.apiBaseUrl)

        // Convert HTTP(S) protocol to WS(S)
        const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'

        // Use the same host and port as the API
        const wsHost = apiUrl.host // includes port if present

        finalWsUrl = `${wsProtocol}//${wsHost}/api/ws/tickets/${ticketId}?token=${token}`

        console.log('[WebSocket] URL constructed from API base URL:', config.apiBaseUrl)
        console.log('[WebSocket] WebSocket URL - protocol:', wsProtocol, 'host:', wsHost)
      }

      console.log('[WebSocket] Connecting to:', finalWsUrl.replace(token, '***'))

      const ws = new WebSocket(finalWsUrl)

      ws.onopen = () => {
        console.log('[WebSocket] Connected to ticket', ticketId)
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: IWebSocketMessage = JSON.parse(event.data)
          console.log('[WebSocket] Message received:', message.event)

          if (message.event === 'new_message') {
            const newMessage = message.data as TSupportTicketMessage

            // Update React Query cache with optimistic update
            queryClient.setQueryData(supportTicketMessageKeys.list(ticketId), (old: any) => {
              if (!old?.data?.data) return old

              // Check if message already exists (avoid duplicates)
              const exists = old.data.data.some(
                (msg: TSupportTicketMessage) => msg.id === newMessage.id
              )
              if (exists) return old

              return {
                ...old,
                data: {
                  ...old.data,
                  data: [...old.data.data, newMessage],
                },
              }
            })
          } else if (message.event === 'connected') {
            console.log('[WebSocket] Connection confirmed:', message.data)
          } else if (message.event === 'error') {
            console.error('[WebSocket] Server error:', message.data)
            setError(message.data as string)
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event)
        setError('WebSocket connection error')
      }

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason)
        setIsConnected(false)

        // Attempt reconnection if not a normal closure and under max attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          console.log(
            `[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY)
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Max reconnection attempts reached')
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('[WebSocket] Connection error:', err)
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
