import type { Context } from 'hono'
import { z } from 'zod'
import type { TUserFcmToken, TUserFcmTokenCreate, TUserFcmTokenUpdate } from '@packages/domain'
import type { UserFcmTokensRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import {
  RegisterTokenService,
  UnregisterTokenService,
  GetUserTokensService,
} from '@src/services/user-fcm-tokens'

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>
type TIdParam = z.infer<typeof IdParamSchema>

const RegisterTokenBodySchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(['web', 'ios', 'android']),
  deviceName: z.string().max(255).nullable().optional(),
})

type TRegisterTokenBody = z.infer<typeof RegisterTokenBodySchema>

const UnregisterTokenBodySchema = z.object({
  token: z.string().min(1).max(500),
})

type TUnregisterTokenBody = z.infer<typeof UnregisterTokenBodySchema>

/**
 * Controller for managing FCM token resources.
 *
 * Endpoints:
 * - GET    /user/:userId           Get all tokens for a user
 * - POST   /user/:userId/register  Register a new FCM token
 * - POST   /user/:userId/unregister Unregister an FCM token
 * - DELETE /:id                    Delete a token by ID
 */
export class UserFcmTokensController extends BaseController<
  TUserFcmToken,
  TUserFcmTokenCreate,
  TUserFcmTokenUpdate
> {
  private readonly registerTokenService: RegisterTokenService
  private readonly unregisterTokenService: UnregisterTokenService
  private readonly getUserTokensService: GetUserTokensService

  constructor(repository: UserFcmTokensRepository) {
    super(repository)

    this.registerTokenService = new RegisterTokenService(repository)
    this.unregisterTokenService = new UnregisterTokenService(repository)
    this.getUserTokensService = new GetUserTokensService(repository)

    this.getByUserId = this.getByUserId.bind(this)
    this.registerToken = this.registerToken.bind(this)
    this.unregisterToken = this.unregisterToken.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'post',
        path: '/user/:userId/register',
        handler: this.registerToken,
        middlewares: [paramsValidator(UserIdParamSchema), bodyValidator(RegisterTokenBodySchema)],
      },
      {
        method: 'post',
        path: '/user/:userId/unregister',
        handler: this.unregisterToken,
        middlewares: [paramsValidator(UserIdParamSchema), bodyValidator(UnregisterTokenBodySchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [paramsValidator(IdParamSchema)],
      },
    ]
  }

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.getUserTokensService.execute({
        userId: ctx.params.userId,
        activeOnly: true,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data.tokens })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async registerToken(c: Context): Promise<Response> {
    const ctx = this.ctx<TRegisterTokenBody, unknown, TUserIdParam>(c)

    try {
      const result = await this.registerTokenService.execute({
        userId: ctx.params.userId,
        token: ctx.body.token,
        platform: ctx.body.platform,
        deviceName: ctx.body.deviceName ?? undefined,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({
        data: result.data.fcmToken,
        isNew: result.data.isNew,
      })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async unregisterToken(c: Context): Promise<Response> {
    const ctx = this.ctx<TUnregisterTokenBody, unknown, TUserIdParam>(c)

    try {
      const result = await this.unregisterTokenService.execute({
        token: ctx.body.token,
        userId: ctx.params.userId,
      })

      if (!result.success) {
        if (result.code === 'BAD_REQUEST') {
          return ctx.badRequest({ error: result.error })
        }
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: { deleted: result.data.deleted } })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
