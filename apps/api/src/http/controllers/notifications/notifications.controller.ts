import type { Context } from 'hono'
import {
  notificationCreateSchema,
  notificationUpdateSchema,
  type TNotification,
  type TNotificationCreate,
  type TNotificationUpdate,
} from '@packages/domain'
import type {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  SendNotificationService,
  GetUserNotificationsService,
  GetUnreadCountService,
  MarkAsReadService,
  MarkAllAsReadService,
} from '@src/services/notifications'

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>
type TIdParam = z.infer<typeof IdParamSchema>

const SendNotificationBodySchema = z.object({
  userId: z.string().uuid(),
  category: z.enum(['payment', 'quota', 'announcement', 'reminder', 'alert', 'system']),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  channels: z.array(z.enum(['in_app', 'email'])).optional(),
  expiresAt: z.string().datetime().optional(),
})

type TSendNotificationBody = z.infer<typeof SendNotificationBodySchema>

/**
 * Controller for managing notification resources.
 *
 * Endpoints:
 * - GET    /                          List all notifications
 * - GET    /user/:userId              Get notifications for user
 * - GET    /user/:userId/unread-count Get unread count for user
 * - GET    /:id                       Get notification by ID
 * - POST   /                          Send a new notification
 * - POST   /:id/read                  Mark notification as read
 * - POST   /user/:userId/read-all     Mark all as read for user
 * - PATCH  /:id                       Update notification
 * - DELETE /:id                       Delete notification
 */
export class NotificationsController extends BaseController<
  TNotification,
  TNotificationCreate,
  TNotificationUpdate
> {
  private readonly sendNotificationService: SendNotificationService
  private readonly getUserNotificationsService: GetUserNotificationsService
  private readonly getUnreadCountService: GetUnreadCountService
  private readonly markAsReadService: MarkAsReadService
  private readonly markAllAsReadService: MarkAllAsReadService

  constructor(
    repository: NotificationsRepository,
    deliveriesRepository: NotificationDeliveriesRepository,
    preferencesRepository: UserNotificationPreferencesRepository
  ) {
    super(repository)

    this.sendNotificationService = new SendNotificationService(
      repository,
      deliveriesRepository,
      preferencesRepository
    )
    this.getUserNotificationsService = new GetUserNotificationsService(repository)
    this.getUnreadCountService = new GetUnreadCountService(repository)
    this.markAsReadService = new MarkAsReadService(repository)
    this.markAllAsReadService = new MarkAllAsReadService(repository)

    this.sendNotification = this.sendNotification.bind(this)
    this.getByUserId = this.getByUserId.bind(this)
    this.getUnreadCount = this.getUnreadCount.bind(this)
    this.markAsRead = this.markAsRead.bind(this)
    this.markAllAsRead = this.markAllAsRead.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/unread-count',
        handler: this.getUnreadCount,
        middlewares: [paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/send',
        handler: this.sendNotification,
        middlewares: [bodyValidator(SendNotificationBodySchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [bodyValidator(notificationCreateSchema)],
      },
      {
        method: 'post',
        path: '/:id/read',
        handler: this.markAsRead,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/user/:userId/read-all',
        handler: this.markAllAsRead,
        middlewares: [paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(notificationUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [paramsValidator(IdParamSchema)],
      },
    ]
  }

  private async sendNotification(c: Context): Promise<Response> {
    const ctx = this.ctx<TSendNotificationBody, unknown, unknown>(c)

    try {
      const result = await this.sendNotificationService.execute({
        userId: ctx.body.userId,
        category: ctx.body.category,
        title: ctx.body.title,
        body: ctx.body.body,
        priority: ctx.body.priority,
        data: ctx.body.data,
        channels: ctx.body.channels,
        expiresAt: ctx.body.expiresAt ? new Date(ctx.body.expiresAt) : undefined,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.getUserNotificationsService.execute({
        userId: ctx.params.userId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getUnreadCount(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.getUnreadCountService.execute({
        userId: ctx.params.userId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async markAsRead(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    try {
      const result = await this.markAsReadService.execute({
        notificationId: ctx.params.id,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async markAllAsRead(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.markAllAsReadService.execute({
        userId: ctx.params.userId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
