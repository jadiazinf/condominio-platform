import type { Context } from 'hono'
import type { TUser } from '@packages/domain'
import type { NotificationsRepository } from '@database/repositories'
import { authMiddleware } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { paramsValidator } from '../../middlewares/utils/payload-validator'
import { createRouter } from '../create-router'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import {
  GetUserNotificationsService,
  GetUserNotificationsPaginatedService,
  GetUnreadCountService,
  MarkAsReadService,
  MarkAllAsReadService,
} from '@src/services/notifications'
import type { IGetUserNotificationsPaginatedInput } from '@src/services/notifications/get-user-notifications-paginated.service'
import { z } from 'zod'

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * User-facing notification controller (auth-only, no role/condominium required).
 *
 * Endpoints:
 * - GET  /              Get current user's notifications
 * - GET  /paginated     Get current user's notifications (paginated)
 * - GET  /unread-count  Get current user's unread count
 * - POST /:id/read      Mark a notification as read
 * - POST /read-all      Mark all notifications as read
 * - DELETE /:id         Delete a notification
 */
export class MyNotificationsController {
  private readonly getUserNotificationsService: GetUserNotificationsService
  private readonly getUserNotificationsPaginatedService: GetUserNotificationsPaginatedService
  private readonly getUnreadCountService: GetUnreadCountService
  private readonly markAsReadService: MarkAsReadService
  private readonly markAllAsReadService: MarkAllAsReadService

  constructor(private readonly repository: NotificationsRepository) {
    this.getUserNotificationsService = new GetUserNotificationsService(repository)
    this.getUserNotificationsPaginatedService = new GetUserNotificationsPaginatedService(repository)
    this.getUnreadCountService = new GetUnreadCountService(repository)
    this.markAsReadService = new MarkAsReadService(repository)
    this.markAllAsReadService = new MarkAllAsReadService(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.list,
        middlewares: [authMiddleware],
      },
      {
        method: 'get',
        path: '/paginated',
        handler: this.listPaginated,
        middlewares: [authMiddleware],
      },
      {
        method: 'get',
        path: '/unread-count',
        handler: this.getUnreadCount,
        middlewares: [authMiddleware],
      },
      {
        method: 'post',
        path: '/:id/read',
        handler: this.markAsRead,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/read-all',
        handler: this.markAllAsRead,
        middlewares: [authMiddleware],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  private list = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.getUserNotificationsService.execute({
        userId: user.id,
      })

      if (!result.success) {
        return c.json({ error: result.error }, 500)
      }

      return c.json({ data: result.data })
    } catch {
      return c.json({ error: 'Failed to fetch notifications' }, 500)
    }
  }

  private listPaginated = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)
    const page = Number(c.req.query('page') || '1')
    const limit = Number(c.req.query('limit') || '20')
    const category = c.req.query('category') || undefined
    const isReadParam = c.req.query('isRead')
    const isRead = isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined

    try {
      const result = await this.getUserNotificationsPaginatedService.execute({
        userId: user.id,
        page,
        limit,
        category: category as IGetUserNotificationsPaginatedInput['category'],
        isRead,
      })

      if (!result.success) {
        return c.json({ error: result.error }, 500)
      }

      return c.json(result.data)
    } catch {
      return c.json({ error: 'Failed to fetch notifications' }, 500)
    }
  }

  private getUnreadCount = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.getUnreadCountService.execute({
        userId: user.id,
      })

      if (!result.success) {
        return c.json({ error: result.error }, 500)
      }

      return c.json({ data: result.data })
    } catch {
      return c.json({ error: 'Failed to fetch unread count' }, 500)
    }
  }

  private markAsRead = async (c: Context): Promise<Response> => {
    const params = c.get('params') as TIdParam

    try {
      const result = await this.markAsReadService.execute({
        notificationId: params.id,
      })

      if (!result.success) {
        return c.json({ error: result.error }, 404)
      }

      return c.json({ data: result.data })
    } catch {
      return c.json({ error: 'Failed to mark notification as read' }, 500)
    }
  }

  private markAllAsRead = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.markAllAsReadService.execute({
        userId: user.id,
      })

      if (!result.success) {
        return c.json({ error: result.error }, 500)
      }

      return c.json({ data: result.data })
    } catch {
      return c.json({ error: 'Failed to mark all as read' }, 500)
    }
  }

  private delete = async (c: Context): Promise<Response> => {
    const params = c.get('params') as TIdParam

    try {
      const deleted = await this.repository.delete(params.id)

      if (!deleted) {
        return c.json({ error: 'Notification not found' }, 404)
      }

      return c.json({ data: { success: true } })
    } catch {
      return c.json({ error: 'Failed to delete notification' }, 500)
    }
  }
}
