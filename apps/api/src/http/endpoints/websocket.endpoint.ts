import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/bun'
import type { ServerWebSocket, WebSocketHandler } from 'bun'
import { admin } from '@libs/firebase/config'
import { DatabaseService } from '@database/service'
import { UsersRepository } from '@database/repositories/users.repository'
import { WebSocketManager } from '@libs/websocket/websocket-manager'
import type { IEndpoint } from './types'

/**
 * WebSocket handler for Bun server
 */
export const websocket: WebSocketHandler<unknown> = {
  message() {
    // Handled by Hono upgradeWebSocket
  },
  open() {
    // Handled by Hono upgradeWebSocket
  },
  close() {
    // Handled by Hono upgradeWebSocket
  },
}

/**
 * WebSocket endpoint for real-time ticket messages
 *
 * Usage: ws://localhost:3001/api/ws/tickets/:ticketId?token=<firebase-token>
 */
export class WebSocketEndpoint implements IEndpoint {
  readonly path = '/ws'
  private readonly wsManager = WebSocketManager.getInstance()

  getRouter(): Hono {
    const app = new Hono()
    const wsManager = this.wsManager

    // WebSocket upgrade endpoint for ticket messages
    app.get(
      '/tickets/:ticketId',
      upgradeWebSocket((c) => {
        const ticketId = c.req.param('ticketId')
        const token = c.req.query('token')
        let wsClient: ServerWebSocket<unknown> | null = null

        return {
          async onOpen(_event, ws) {
            wsClient = ws.raw as ServerWebSocket<unknown>
            console.log(`[WebSocket] Connection opened for ticket ${ticketId}`)

            // Authenticate user
            if (!token) {
              ws.send(JSON.stringify({ event: 'error', data: 'No token provided' }))
              ws.close(1008, 'Authentication required')
              return
            }

            try {
              // Verify Firebase token
              const decodedToken = await admin.auth().verifyIdToken(token)

              // Get user from database
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

              // Add client to ticket room
              if (wsClient) {
                wsManager.addClient(wsClient, user, ticketId)
              }

              // Send success message
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

          onMessage(_event, _ws) {
            console.log(`[WebSocket] Message received for ticket ${ticketId}`)
            // We don't handle incoming messages - all messages go through HTTP API
            // This is just here for protocol compliance
          },

          onClose() {
            console.log(`[WebSocket] Connection closed for ticket ${ticketId}`)
            if (wsClient) {
              wsManager.removeClient(wsClient)
            }
          },

          onError(_event, _ws) {
            console.error(`[WebSocket] Error for ticket ${ticketId}`)
            if (wsClient) {
              wsManager.removeClient(wsClient)
            }
          },
        }
      })
    )

    return app
  }
}
