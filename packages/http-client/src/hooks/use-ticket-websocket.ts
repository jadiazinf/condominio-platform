'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { TSupportTicketMessage, TSupportTicket } from '@packages/domain'
import { useQueryClient } from '@tanstack/react-query'
import { supportTicketMessageKeys } from './use-support-ticket-messages'
import { supportTicketKeys } from './use-support-tickets'
import { userTicketKeys } from './use-user-tickets'
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
  const tokenRef = useRef(token)
  const enabledRef = useRef(enabled)
  const wsUrlRef = useRef(wsUrl)
  const ticketIdRef = useRef(ticketId)
  const connectingRef = useRef(false)
  const queryClient = useQueryClient()
  const queryClientRef = useRef(queryClient)

  // Keep refs in sync
  tokenRef.current = token
  enabledRef.current = enabled
  wsUrlRef.current = wsUrl
  ticketIdRef.current = ticketId
  queryClientRef.current = queryClient

  const MAX_RECONNECT_ATTEMPTS = 3
  const RECONNECT_DELAY = 3000

  const connect = useCallback(() => {
    const currentToken = tokenRef.current
    const currentTicketId = ticketIdRef.current

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
        finalWsUrl = `${currentWsUrl}/tickets/${currentTicketId}?token=${currentToken}`
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

        finalWsUrl = `${wsProtocol}//${wsHost}/api/ws/tickets/${currentTicketId}?token=${currentToken}`
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
          const tid = ticketIdRef.current

          if (message.event === 'new_message') {
            const newMessage = message.data as TSupportTicketMessage

            // Update superadmin message cache
            qc.setQueryData(
              supportTicketMessageKeys.list(tid),
              (old: { data: TSupportTicketMessage[] } | undefined) => {
                if (!old?.data) return old
                const exists = old.data.some(msg => msg.id === newMessage.id)
                if (exists) return old
                return { ...old, data: [...old.data, newMessage] }
              }
            )

            // Update user ticket message cache
            qc.setQueryData(
              userTicketKeys.messages(tid),
              (old: { data: TSupportTicketMessage[] } | undefined) => {
                if (!old?.data) return old
                const exists = old.data.some(msg => msg.id === newMessage.id)
                if (exists) return old
                return { ...old, data: [...old.data, newMessage] }
              }
            )
          }

          if (message.event === 'ticket_updated') {
            const updatedTicket = message.data as TSupportTicket

            // Update superadmin ticket detail cache
            qc.setQueryData(
              supportTicketKeys.detail(tid),
              (old: { data: TSupportTicket } | undefined) => {
                if (!old) return old
                return { ...old, data: { ...old.data, ...updatedTicket } }
              }
            )

            // Update user ticket detail cache
            qc.setQueryData(
              userTicketKeys.detail(tid),
              (old: { data: TSupportTicket } | undefined) => {
                if (!old) return old
                return { ...old, data: { ...old.data, ...updatedTicket } }
              }
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
