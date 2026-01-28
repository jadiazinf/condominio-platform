import type { ServerWebSocket } from 'bun'
import type { TUser } from '@packages/domain'

export interface IWebSocketClient {
  ws: ServerWebSocket<unknown>
  user: TUser
  ticketId: string
}

/**
 * WebSocket Manager for handling real-time ticket message updates
 * Manages rooms (one per ticket) and broadcasts messages to connected clients
 */
export class WebSocketManager {
  private static instance: WebSocketManager
  private clients: Map<ServerWebSocket<unknown>, IWebSocketClient> = new Map()
  private rooms: Map<string, Set<ServerWebSocket<unknown>>> = new Map()

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  /**
   * Add a client to a ticket room
   */
  public addClient(ws: ServerWebSocket<unknown>, user: TUser, ticketId: string): void {
    // Store client info
    this.clients.set(ws, { ws, user, ticketId })

    // Add to room
    if (!this.rooms.has(ticketId)) {
      this.rooms.set(ticketId, new Set())
    }
    this.rooms.get(ticketId)!.add(ws)
  }

  /**
   * Remove a client and clean up empty rooms
   */
  public removeClient(ws: ServerWebSocket<unknown>): void {
    const client = this.clients.get(ws)
    if (!client) return

    const { ticketId } = client

    // Remove from room
    const room = this.rooms.get(ticketId)
    if (room) {
      room.delete(ws)
      if (room.size === 0) {
        this.rooms.delete(ticketId)
      }
    }

    // Remove client
    this.clients.delete(ws)
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
        // Remove broken connection
        this.removeClient(ws)
      }
    }
  }

  /**
   * Get the number of clients in a ticket room
   */
  public getRoomSize(ticketId: string): number {
    return this.rooms.get(ticketId)?.size ?? 0
  }

  /**
   * Get total number of connected clients
   */
  public getTotalClients(): number {
    return this.clients.size
  }

  /**
   * Get all active room IDs
   */
  public getActiveRooms(): string[] {
    return Array.from(this.rooms.keys())
  }
}
