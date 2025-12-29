import type { Context } from 'hono'
import {
  userCreateSchema,
  userUpdateSchema,
  type TUser,
  type TUserCreate,
  type TUserUpdate,
} from '@packages/domain'
import type { UsersRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetUserByEmailService,
  GetUserByFirebaseUidService,
  UpdateLastLoginService,
} from '@src/services/users'

const EmailParamSchema = z.object({
  email: z.email('Invalid email format'),
})

type TEmailParam = z.infer<typeof EmailParamSchema>

const FirebaseUidParamSchema = z.object({
  firebaseUid: z.string().min(1),
})

type TFirebaseUidParam = z.infer<typeof FirebaseUidParamSchema>

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for managing user resources.
 *
 * Endpoints:
 * - GET    /                           List all users
 * - GET    /email/:email               Get user by email
 * - GET    /firebase/:firebaseUid      Get user by Firebase UID
 * - GET    /:id                        Get user by ID
 * - POST   /:id/last-login             Update user's last login
 * - POST   /                           Create user
 * - PATCH  /:id                        Update user
 * - DELETE /:id                        Delete user
 */
export class UsersController extends BaseController<TUser, TUserCreate, TUserUpdate> {
  private readonly getUserByEmailService: GetUserByEmailService
  private readonly getUserByFirebaseUidService: GetUserByFirebaseUidService
  private readonly updateLastLoginService: UpdateLastLoginService

  constructor(repository: UsersRepository) {
    super(repository)

    // Initialize services
    this.getUserByEmailService = new GetUserByEmailService(repository)
    this.getUserByFirebaseUidService = new GetUserByFirebaseUidService(repository)
    this.updateLastLoginService = new UpdateLastLoginService(repository)

    // Bind custom methods to ensure correct 'this' context when used as route handlers
    this.getByEmail = this.getByEmail.bind(this)
    this.getByFirebaseUid = this.getByFirebaseUid.bind(this)
    this.updateLastLogin = this.updateLastLogin.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/email/:email',
        handler: this.getByEmail,
        middlewares: [authMiddleware, paramsValidator(EmailParamSchema)],
      },
      {
        method: 'get',
        path: '/firebase/:firebaseUid',
        handler: this.getByFirebaseUid,
        middlewares: [authMiddleware, paramsValidator(FirebaseUidParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/last-login',
        handler: this.updateLastLogin,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, bodyValidator(userCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(userUpdateSchema),
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getByEmail(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TEmailParam>(c)

    try {
      const result = await this.getUserByEmailService.execute({
        email: ctx.params.email,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByFirebaseUid(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TFirebaseUidParam>(c)

    try {
      const result = await this.getUserByFirebaseUidService.execute({
        firebaseUid: ctx.params.firebaseUid,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async updateLastLogin(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    try {
      const result = await this.updateLastLoginService.execute({
        userId: ctx.params.id,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
