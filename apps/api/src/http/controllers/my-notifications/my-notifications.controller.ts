import type { Context } from 'hono'
import type { TUser } from '@packages/domain'
import type { NotificationsRepository } from '@database/repositories'
import { authMiddleware } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { paramsValidator } from '../../middlewares/utils/payload-validator'
import { createRouter } from '../create-router'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { GetUserNotificationsPaginatedService } from '@src/services/notifications'
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
  private readonly getUserNotificationsPaginatedService: GetUserNotificationsPaginatedService

  constructor(private readonly repository: NotificationsRepository) {
    this.getUserNotificationsPaginatedService = new GetUserNotificationsPaginatedService(repository)
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
    const notifications = await this.repository.getByUserId(user.id)
    return c.json({ data: notifications })
  }

  private listPaginated = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)
    const page = Math.max(1, Number(c.req.query('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || '20')))
    const category = c.req.query('category') || undefined
    const isReadParam = c.req.query('isRead')
    const isRead = isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined

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
  }

  private getUnreadCount = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)
    const count = await this.repository.getUnreadCount(user.id)
    return c.json({ data: { count } })
  }

  private markAsRead = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)
    const params = c.get('params') as TIdParam

    // Verify notification belongs to the authenticated user
    const existing = await this.repository.getById(params.id)
    if (!existing || existing.userId !== user.id) {
      return c.json({ error: 'Notification not found' }, 404)
    }

    const notification = await this.repository.markAsRead(params.id)

    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404)
    }

    return c.json({ data: notification })
  }

  private markAllAsRead = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)
    const count = await this.repository.markAllAsRead(user.id)
    return c.json({ data: { count } })
  }

  private delete = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)
    const params = c.get('params') as TIdParam

    // Verify notification belongs to the authenticated user
    const existing = await this.repository.getById(params.id)
    if (!existing || existing.userId !== user.id) {
      return c.json({ error: 'Notification not found' }, 404)
    }

    const deleted = await this.repository.delete(params.id)

    if (!deleted) {
      return c.json({ error: 'Notification not found' }, 404)
    }

    return c.json({ data: { success: true } })
  }
}
