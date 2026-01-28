import { Hono } from 'hono'
import type { Server, ServerWebSocket, WebSocketHandler } from 'bun'
import { admin } from '@libs/firebase/config'
import { DatabaseService } from '@database/service'
import { UsersRepository } from '@database/repositories/users.repository'
import { WebSocketManager } from '@libs/websocket/websocket-manager'
import type { IEndpoint } from './types'

// WebSocket data interface
interface IWebSocketData {
  ticketId: string
  token: string
}

// Get singleton WebSocketManager
const wsManager = WebSocketManager.getInstance()

/**
 * Handle WebSocket upgrade directly from Bun server (bypasses Hono middleware)
 */
export function handleWebSocketUpgrade(req: Request, server: Server<IWebSocketData>, url: URL): boolean {
  // Parse route: /api/ws/tickets/:ticketId
  const match = url.pathname.match(/^\/api\/ws\/tickets\/([^/]+)$/)

  if (!match) {
    return false
  }

  const ticketId = match[1]
  const token = url.searchParams.get('token') || ''

  return server.upgrade(req, {
    data: { ticketId, token } as IWebSocketData,
  })
}

/**
 * WebSocket handler for Bun server - handles events after upgrade
 */
export const websocket: WebSocketHandler<IWebSocketData> = {
  async open(ws) {
    const { ticketId, token } = ws.data

    if (!token) {
      ws.send(JSON.stringify({ event: 'error', data: 'No token provided' }))
      ws.close(1008, 'Authentication required')
      return
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token)

      const db = DatabaseService.getInstance().getDb()
      const usersRepository = new UsersRepository(db)
      const user = await usersRepository.getByFirebaseUid(decodedToken.uid)

      if (!user) {
        ws.send(JSON.stringify({ event: 'error', data: 'User not found' }))
        ws.close(1008, 'User not registered')
        return
      }

      if (!user.isActive) {
        ws.send(JSON.stringify({ event: 'error', data: 'User account is disabled' }))
        ws.close(1008, 'User disabled')
        return
      }

      // Add client to room
      wsManager.addClient(ws as unknown as ServerWebSocket<unknown>, user, ticketId)

      ws.send(
        JSON.stringify({
          event: 'connected',
          data: { ticketId, userId: user.id, message: 'Connected successfully' },
        })
      )
    } catch (error) {
      console.error('[WebSocket] Authentication error:', error)
      ws.send(JSON.stringify({ event: 'error', data: 'Authentication failed' }))
      ws.close(1008, 'Invalid token')
    }
  },

  message() {},

  close(ws) {
    wsManager.removeClient(ws as unknown as ServerWebSocket<unknown>)
  },
}

/**
 * WebSocket endpoint - handles upgrade requests
 */
export class WebSocketEndpoint implements IEndpoint {
  readonly path = '/ws'

  getRouter(): Hono {
    const app = new Hono()

    // This route triggers the WebSocket upgrade (fallback, main upgrade is in main.ts)
    app.get('/tickets/:ticketId', (c) => {
      const ticketId = c.req.param('ticketId')
      const token = c.req.query('token') || ''

      const server = (c.env as any)?.server

      if (!server?.upgrade) {
        return c.text('WebSocket not supported', 500)
      }

      const success = server.upgrade(c.req.raw, {
        data: { ticketId, token } as IWebSocketData,
      })

      if (success) {
        return undefined as any
      }

      return c.text('WebSocket upgrade failed', 400)
    })

    return app
  }
}
