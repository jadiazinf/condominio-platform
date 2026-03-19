import type { Server, ServerWebSocket, WebSocketHandler } from 'bun'
import { admin } from '@libs/firebase/config'
import { DatabaseService } from '@database/service'
import { UsersRepository } from '@database/repositories/users.repository'
import { SupportTicketsRepository } from '@database/repositories/support-tickets.repository'
import { UserRolesRepository } from '@database/repositories/user-roles.repository'
import { checkTicketAccess } from '@http/middlewares/utils/auth/can-access-ticket'
import { WebSocketManager } from './websocket-manager'

// WebSocket data interface
interface IWebSocketData {
  type: 'ticket' | 'notification'
  ticketId?: string
  token: string
}

// Get singleton WebSocketManager
const wsManager = WebSocketManager.getInstance()

// Track recently rejected tokens to avoid log spam from reconnection loops
const rejectedTokens = new Map<string, number>()
const REJECTION_COOLDOWN_MS = 30_000 // 30 seconds

function isTokenRecentlyRejected(token: string): boolean {
  const lastRejected = rejectedTokens.get(token)
  if (!lastRejected) return false
  if (Date.now() - lastRejected > REJECTION_COOLDOWN_MS) {
    rejectedTokens.delete(token)
    return false
  }
  return true
}

function markTokenRejected(token: string) {
  rejectedTokens.set(token, Date.now())
  // Clean up old entries periodically
  if (rejectedTokens.size > 100) {
    const now = Date.now()
    for (const [t, time] of rejectedTokens) {
      if (now - time > REJECTION_COOLDOWN_MS) {
        rejectedTokens.delete(t)
      }
    }
  }
}

/**
 * Handle WebSocket upgrade directly from Bun server (bypasses Hono middleware)
 */
export function handleWebSocketUpgrade(
  req: Request,
  server: Server<IWebSocketData>,
  url: URL
): boolean {
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
async function authenticateWebSocket(
  ws: ServerWebSocket<IWebSocketData>
): Promise<ReturnType<UsersRepository['getByFirebaseUid']>> {
  const { token } = ws.data

  if (!token) {
    ws.close(1008, 'Authentication required')
    return null
  }

  // Skip verification for recently rejected tokens (prevents log spam)
  if (isTokenRecentlyRejected(token)) {
    ws.close(1008, 'Token expired')
    return null
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)

    const db = DatabaseService.getInstance().getDb()
    const usersRepository = new UsersRepository(db)
    const user = await usersRepository.getByFirebaseUid(decodedToken.uid)

    if (!user) {
      ws.close(1008, 'User not registered')
      return null
    }

    if (!user.isActive) {
      ws.close(1008, 'User disabled')
      return null
    }

    return user
  } catch (error) {
    const isExpired = error instanceof Error && error.message.includes('id-token-expired')
    if (isExpired) {
      console.warn('[WebSocket] Token expired, closing connection')
      markTokenRejected(token)
    } else {
      console.error(
        '[WebSocket] Authentication error:',
        error instanceof Error ? error.message : error
      )
    }
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

    const db = DatabaseService.getInstance().getDb()
    const wsUntyped = ws as unknown as ServerWebSocket<unknown>

    if (ws.data.type === 'notification') {
      wsManager.addUserClient(wsUntyped, user)
      console.log(`[WebSocket] Notifications connected for user ${user.email}`)
      ws.send(
        JSON.stringify({
          event: 'connected',
          data: { userId: user.id, message: 'Notifications connected' },
        })
      )
    } else {
      const ticketId = ws.data.ticketId!

      // Verify user has access to this ticket
      const ticketsRepository = new SupportTicketsRepository(db)
      const ticket = await ticketsRepository.getById(ticketId)

      if (!ticket) {
        ws.close(1008, 'Ticket not found')
        return
      }

      const hasAccess = await checkTicketAccess(user.id, ticket, db)
      if (!hasAccess) {
        ws.close(1008, 'Access denied')
        return
      }

      const userRolesRepository = new UserRolesRepository(db)
      const isSuperadmin = await userRolesRepository.isUserSuperadmin(user.id)

      wsManager.addClient(wsUntyped, user, ticketId, isSuperadmin)
      console.log(`[WebSocket] Ticket ${ticketId} connected for user ${user.email}`)
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
