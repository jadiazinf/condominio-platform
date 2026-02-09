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
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
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
 * Notifications are user-scoped, not condominium-scoped. They are tied to a userId
 * rather than a condominiumId. The CONDOMINIUM_ID_PROP is available from context
 * via requireRole() middleware but is not used for scoping in this controller.
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

  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT')] },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT', 'USER'), paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/unread-count',
        handler: this.getUnreadCount,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT', 'USER'), paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT', 'USER'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/send',
        handler: this.sendNotification,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT'), bodyValidator(SendNotificationBodySchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT'), bodyValidator(notificationCreateSchema)],
      },
      {
        method: 'post',
        path: '/:id/read',
        handler: this.markAsRead,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT', 'USER'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/user/:userId/read-all',
        handler: this.markAllAsRead,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT', 'USER'), paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT'), paramsValidator(IdParamSchema), bodyValidator(notificationUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  private sendNotification = async (c: Context): Promise<Response> => {
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

  private getByUserId = async (c: Context): Promise<Response> => {
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

  private getUnreadCount = async (c: Context): Promise<Response> => {
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

  private markAsRead = async (c: Context): Promise<Response> => {
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

  private markAllAsRead = async (c: Context): Promise<Response> => {
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
