import { Hono } from 'hono'
import type { Server, ServerWebSocket, WebSocketHandler } from 'bun'
import { admin } from '@libs/firebase/config'
import { DatabaseService } from '@database/service'
import { UsersRepository } from '@database/repositories/users.repository'
import { WebSocketManager } from '@libs/websocket/websocket-manager'
import type { IEndpoint } from './types'

// WebSocket data interface
interface IWebSocketData {
  type: 'ticket' | 'notification'
  ticketId?: string
  token: string
}

// Get singleton WebSocketManager
const wsManager = WebSocketManager.getInstance()

/**
 * Handle WebSocket upgrade directly from Bun server (bypasses Hono middleware)
 */
export function handleWebSocketUpgrade(req: Request, server: Server<IWebSocketData>, url: URL): boolean {
  const token = url.searchParams.get('token') || ''

  // Route: /api/ws/tickets/:ticketId
  const ticketMatch = url.pathname.match(/^\/api\/ws\/tickets\/([^/]+)$/)
  if (ticketMatch) {
    return server.upgrade(req, {
      data: { type: 'ticket', ticketId: ticketMatch[1], token } as IWebSocketData,
    })
  }

  // Route: /api/ws/notifications
  if (url.pathname === '/api/ws/notifications') {
    return server.upgrade(req, {
      data: { type: 'notification', token } as IWebSocketData,
    })
  }

  return false
}

/**
 * Authenticate a WebSocket connection and return the user
 */
async function authenticateWebSocket(ws: ServerWebSocket<IWebSocketData>): Promise<ReturnType<UsersRepository['getByFirebaseUid']>> {
  const { token } = ws.data

  if (!token) {
    ws.send(JSON.stringify({ event: 'error', data: 'No token provided' }))
    ws.close(1008, 'Authentication required')
    return null
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)

    const db = DatabaseService.getInstance().getDb()
    const usersRepository = new UsersRepository(db)
    const user = await usersRepository.getByFirebaseUid(decodedToken.uid)

    if (!user) {
      ws.send(JSON.stringify({ event: 'error', data: 'User not found' }))
      ws.close(1008, 'User not registered')
      return null
    }

    if (!user.isActive) {
      ws.send(JSON.stringify({ event: 'error', data: 'User account is disabled' }))
      ws.close(1008, 'User disabled')
      return null
    }

    return user
  } catch (error) {
    const isExpired = error instanceof Error && error.message.includes('id-token-expired')
    if (isExpired) {
      console.warn('[WebSocket] Token expired, closing connection')
    } else {
      console.error('[WebSocket] Authentication error:', error instanceof Error ? error.message : error)
    }
    ws.send(JSON.stringify({ event: 'error', data: isExpired ? 'Token expired' : 'Authentication failed' }))
    ws.close(1008, isExpired ? 'Token expired' : 'Invalid token')
    return null
  }
}

/**
 * WebSocket handler for Bun server - handles events after upgrade
 */
export const websocket: WebSocketHandler<IWebSocketData> = {
  async open(ws) {
    const user = await authenticateWebSocket(ws)
    if (!user) return

    const wsUntyped = ws as unknown as ServerWebSocket<unknown>

    if (ws.data.type === 'notification') {
      wsManager.addUserClient(wsUntyped, user)
      ws.send(
        JSON.stringify({
          event: 'connected',
          data: { userId: user.id, message: 'Notifications connected' },
        })
      )
    } else {
      const ticketId = ws.data.ticketId!
      wsManager.addClient(wsUntyped, user, ticketId)
      ws.send(
        JSON.stringify({
          event: 'connected',
          data: { ticketId, userId: user.id, message: 'Connected successfully' },
        })
      )
    }
  },

  message() {},

  close(ws) {
    wsManager.removeClient(ws as unknown as ServerWebSocket<unknown>)
  },
}

/**
 * WebSocket endpoint - handles upgrade requests (Hono fallback)
 */
export class WebSocketEndpoint implements IEndpoint {
  readonly path = '/ws'

  getRouter(): Hono {
    const app = new Hono()

    // Ticket WebSocket upgrade (fallback, main upgrade is in main.ts)
    app.get('/tickets/:ticketId', (c) => {
      const ticketId = c.req.param('ticketId')
      const token = c.req.query('token') || ''

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Bun-specific server property
      const server = (c.env as Record<string, unknown>)?.server as { upgrade?: (req: Request, options: { data: IWebSocketData }) => boolean } | undefined

      if (!server?.upgrade) {
        return c.text('WebSocket not supported', 500)
      }

      const success = server.upgrade(c.req.raw, {
        data: { type: 'ticket', ticketId, token } as IWebSocketData,
      })

      if (success) {
        return undefined as unknown as Response
      }

      return c.text('WebSocket upgrade failed', 400)
    })

    // Notification WebSocket upgrade (fallback)
    app.get('/notifications', (c) => {
      const token = c.req.query('token') || ''

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Bun-specific server property
      const server = (c.env as Record<string, unknown>)?.server as { upgrade?: (req: Request, options: { data: IWebSocketData }) => boolean } | undefined

      if (!server?.upgrade) {
        return c.text('WebSocket not supported', 500)
      }

      const success = server.upgrade(c.req.raw, {
        data: { type: 'notification', token } as IWebSocketData,
      })

      if (success) {
        return undefined as unknown as Response
      }

      return c.text('WebSocket upgrade failed', 400)
    })

    return app
  }
}
