import type { ServerWebSocket } from 'bun'
import type { TUser } from '@packages/domain'

export interface IWebSocketClient {
  ws: ServerWebSocket<unknown>
  user: TUser
  ticketId: string
}

export interface IUserWebSocketClient {
  ws: ServerWebSocket<unknown>
  user: TUser
}

/**
 * WebSocket Manager for handling real-time updates.
 * Manages ticket rooms and user notification channels.
 */
export class WebSocketManager {
  private static instance: WebSocketManager

  // Ticket rooms
  private clients: Map<ServerWebSocket<unknown>, IWebSocketClient> = new Map()
  private rooms: Map<string, Set<ServerWebSocket<unknown>>> = new Map()

  // User notification channels
  private userClients: Map<ServerWebSocket<unknown>, IUserWebSocketClient> = new Map()
  private userRooms: Map<string, Set<ServerWebSocket<unknown>>> = new Map()

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  // ─── Ticket rooms ───

  /**
   * Add a client to a ticket room
   */
  public addClient(ws: ServerWebSocket<unknown>, user: TUser, ticketId: string): void {
    this.clients.set(ws, { ws, user, ticketId })

    if (!this.rooms.has(ticketId)) {
      this.rooms.set(ticketId, new Set())
    }
    this.rooms.get(ticketId)!.add(ws)
  }

  /**
   * Remove a ticket client and clean up empty rooms
   */
  public removeClient(ws: ServerWebSocket<unknown>): void {
    // Check ticket clients
    const client = this.clients.get(ws)
    if (client) {
      const room = this.rooms.get(client.ticketId)
      if (room) {
        room.delete(ws)
        if (room.size === 0) {
          this.rooms.delete(client.ticketId)
        }
      }
      this.clients.delete(ws)
      return
    }

    // Check user notification clients
    this.removeUserClient(ws)
  }

  /**
   * Broadcast a message to all clients in a ticket room
   */
  public broadcastToTicket(ticketId: string, event: string, data: unknown): void {
    const room = this.rooms.get(ticketId)
    if (!room || room.size === 0) {
      return
    }

    const message = JSON.stringify({ event, data })

    for (const ws of room) {
      try {
        ws.send(message)
      } catch {
        this.removeClient(ws)
      }
    }
  }

  // ─── User notification channels ───

  /**
   * Add a client to a user's notification channel
   */
  public addUserClient(ws: ServerWebSocket<unknown>, user: TUser): void {
    this.userClients.set(ws, { ws, user })

    if (!this.userRooms.has(user.id)) {
      this.userRooms.set(user.id, new Set())
    }
    this.userRooms.get(user.id)!.add(ws)
  }

  /**
   * Remove a user notification client and clean up empty rooms
   */
  public removeUserClient(ws: ServerWebSocket<unknown>): void {
    const client = this.userClients.get(ws)
    if (!client) return

    const room = this.userRooms.get(client.user.id)
    if (room) {
      room.delete(ws)
      if (room.size === 0) {
        this.userRooms.delete(client.user.id)
      }
    }

    this.userClients.delete(ws)
  }

  /**
   * Broadcast a message to all of a user's notification connections
   */
  public broadcastToUser(userId: string, event: string, data: unknown): void {
    const room = this.userRooms.get(userId)
    if (!room || room.size === 0) {
      return
    }

    const message = JSON.stringify({ event, data })

    for (const ws of room) {
      try {
        ws.send(message)
      } catch {
        this.removeUserClient(ws)
      }
    }
  }

  // ─── Stats ───

  public getRoomSize(ticketId: string): number {
    return this.rooms.get(ticketId)?.size ?? 0
  }

  public getTotalClients(): number {
    return this.clients.size + this.userClients.size
  }

  public getActiveRooms(): string[] {
    return Array.from(this.rooms.keys())
  }

  public getActiveUserRooms(): string[] {
    return Array.from(this.userRooms.keys())
  }
}
