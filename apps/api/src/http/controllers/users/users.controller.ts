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

const EmailParamSchema = z.object({
  email: z.email('Invalid email format'),
})

type TEmailParam = z.infer<typeof EmailParamSchema>

const FirebaseUidParamSchema = z.object({
  firebaseUid: z.string().min(1),
})

type TFirebaseUidParam = z.infer<typeof FirebaseUidParamSchema>

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
  constructor(repository: UsersRepository) {
    super(repository)
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
    const repo = this.repository as UsersRepository

    try {
      const user = await repo.getByEmail(ctx.params.email)

      if (!user) {
        return ctx.notFound({ error: 'User not found' })
      }

      return ctx.ok({ data: user })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByFirebaseUid(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TFirebaseUidParam>(c)
    const repo = this.repository as UsersRepository

    try {
      const user = await repo.getByFirebaseUid(ctx.params.firebaseUid)

      if (!user) {
        return ctx.notFound({ error: 'User not found' })
      }

      return ctx.ok({ data: user })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async updateLastLogin(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as UsersRepository

    try {
      const user = await repo.updateLastLogin(ctx.params.id)

      if (!user) {
        return ctx.notFound({ error: 'User not found' })
      }

      return ctx.ok({ data: user })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
