import type { Context } from 'hono'
import {
  userNotificationPreferenceCreateSchema,
  userNotificationPreferenceUpdateSchema,
  type TUserNotificationPreference,
  type TUserNotificationPreferenceCreate,
  type TUserNotificationPreferenceUpdate,
} from '@packages/domain'
import type { UserNotificationPreferencesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { authMiddleware } from '../../middlewares/auth'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetUserPreferencesService,
  UpdateUserPreferenceService,
  InitializeUserPreferencesService,
} from '@src/services/user-notification-preferences'

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

const UpdatePreferenceBodySchema = z.object({
  category: z.enum(['payment', 'quota', 'announcement', 'reminder', 'alert', 'system']),
  channel: z.enum(['in_app', 'email']),
  isEnabled: z.boolean().optional(),
  quietHoursStart: z.string().max(5).nullable().optional(),
  quietHoursEnd: z.string().max(5).nullable().optional(),
})

type TUpdatePreferenceBody = z.infer<typeof UpdatePreferenceBodySchema>

/**
 * Controller for managing user notification preference resources.
 *
 * Endpoints:
 * - GET    /                   List all preferences
 * - GET    /user/:userId       Get preferences for user
 * - GET    /:id                Get preference by ID
 * - POST   /                   Create preference
 * - POST   /user/:userId/initialize  Initialize defaults for user
 * - PUT    /user/:userId       Update/upsert preference for user
 * - PATCH  /:id                Update preference
 * - DELETE /:id                Delete preference
 */
export class UserNotificationPreferencesController extends BaseController<
  TUserNotificationPreference,
  TUserNotificationPreferenceCreate,
  TUserNotificationPreferenceUpdate
> {
  private readonly getUserPreferencesService: GetUserPreferencesService
  private readonly updateUserPreferenceService: UpdateUserPreferenceService
  private readonly initializeUserPreferencesService: InitializeUserPreferencesService

  constructor(repository: UserNotificationPreferencesRepository) {
    super(repository)

    this.getUserPreferencesService = new GetUserPreferencesService(repository)
    this.updateUserPreferenceService = new UpdateUserPreferenceService(repository)
    this.initializeUserPreferencesService = new InitializeUserPreferencesService(repository)

  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, bodyValidator(userNotificationPreferenceCreateSchema)],
      },
      {
        method: 'post',
        path: '/user/:userId/initialize',
        handler: this.initializeForUser,
        middlewares: [authMiddleware, paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'put',
        path: '/user/:userId',
        handler: this.updateForUser,
        middlewares: [
          authMiddleware,
          paramsValidator(UserIdParamSchema),
          bodyValidator(UpdatePreferenceBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(userNotificationPreferenceUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
    ]
  }

  private getByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.getUserPreferencesService.execute({
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

  private updateForUser = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TUpdatePreferenceBody, unknown, TUserIdParam>(c)

    try {
      const result = await this.updateUserPreferenceService.execute({
        userId: ctx.params.userId,
        category: ctx.body.category,
        channel: ctx.body.channel,
        isEnabled: ctx.body.isEnabled,
        quietHoursStart: ctx.body.quietHoursStart,
        quietHoursEnd: ctx.body.quietHoursEnd,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private initializeForUser = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.initializeUserPreferencesService.execute({
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
