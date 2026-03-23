import type { Context, MiddlewareHandler } from 'hono'
import { z } from 'zod'
import { WebSocketManager } from '@libs/websocket/websocket-manager'
import type { NotificationsRepository } from '@database/repositories'
import { env } from '@config/environment'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { bodyValidator } from '../../middlewares/utils/payload-validator'

const BroadcastNotificationSchema = z.object({
  userId: z.string().uuid(),
  notificationId: z.string().uuid(),
})

/**
 * Internal controller for inter-service communication.
 * Secured by a shared INTERNAL_API_KEY header.
 */
export class InternalController {
  constructor(private readonly notificationsRepo: NotificationsRepository) {}

  createRouter() {
    const routes: TRouteDefinition[] = [
      {
        method: 'post',
        path: '/broadcast-notification',
        handler: this.broadcastNotification,
        middlewares: [this.requireInternalApiKey, bodyValidator(BroadcastNotificationSchema)],
      },
    ]
    return createRouter(routes)
  }

  /**
   * Middleware: validates the x-internal-api-key header.
   */
  private requireInternalApiKey: MiddlewareHandler = async (ctx, next) => {
    const key = env.INTERNAL_API_KEY
    if (!key) {
      return ctx.json({ error: 'Internal API not configured' }, 503)
    }

    const provided = ctx.req.header('x-internal-api-key')
    if (provided !== key) {
      return ctx.json({ error: 'Unauthorized' }, 401)
    }

    await next()
  }

  /**
   * POST /broadcast-notification
   * Called by charges-worker after creating a notification to trigger WebSocket broadcast.
   */
  private broadcastNotification = async (ctx: Context) => {
    const body = await ctx.req.json()
    const { userId, notificationId } = body as z.infer<typeof BroadcastNotificationSchema>

    const notification = await this.notificationsRepo.getById(notificationId)
    if (!notification) {
      return ctx.json({ error: 'Notification not found' }, 404)
    }

    const unreadCount = await this.notificationsRepo.getUnreadCount(userId)

    WebSocketManager.getInstance().broadcastToUser(userId, 'new_notification', {
      notification,
      unreadCount,
    })

    return ctx.json({ ok: true })
  }
}
