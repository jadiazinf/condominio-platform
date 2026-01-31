import type { Context } from 'hono'
import {
  superadminUserCreateSchema,
  superadminUserUpdateSchema,
  type TSuperadminUser,
  type TSuperadminUserCreate,
  type TSuperadminUserUpdate,
} from '@packages/domain'
import type { SuperadminUsersRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const UserIdParamSchema = z.object({
  userId: z.string().uuid(),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

/**
 * Controller for managing superadmin users.
 *
 * Endpoints:
 * - GET    /              List all superadmin users
 * - GET    /active-users  Get all active superadmin users (TUser objects)
 * - GET    /user/:userId  Get by user ID
 * - GET    /check/:userId Check if user is superadmin
 * - GET    /:id           Get by ID
 * - POST   /              Create superadmin user
 * - PATCH  /:id           Update superadmin user
 * - DELETE /:id           Delete superadmin user (soft delete)
 */
export class SuperadminUsersController extends BaseController<
  TSuperadminUser,
  TSuperadminUserCreate,
  TSuperadminUserUpdate
> {
  constructor(repository: SuperadminUsersRepository) {
    super(repository)
    this.getByUserId = this.getByUserId.bind(this)
    this.checkIsSuperadmin = this.checkIsSuperadmin.bind(this)
    this.getActiveSuperadminUsers = this.getActiveSuperadminUsers.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/active-users',
        handler: this.getActiveSuperadminUsers,
        middlewares: [authMiddleware],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/check/:userId',
        handler: this.checkIsSuperadmin,
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
        middlewares: [authMiddleware, bodyValidator(superadminUserCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(superadminUserUpdateSchema),
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

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as SuperadminUsersRepository

    try {
      const superadmin = await repo.getByUserId(ctx.params.userId)

      if (!superadmin) {
        return ctx.notFound({ error: 'Superadmin user not found' })
      }

      return ctx.ok({ data: superadmin })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async checkIsSuperadmin(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as SuperadminUsersRepository

    try {
      const isSuperadmin = await repo.isUserSuperadmin(ctx.params.userId)
      return ctx.ok({ data: { isSuperadmin } })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getActiveSuperadminUsers(c: Context): Promise<Response> {
    const ctx = this.ctx(c)
    const repo = this.repository as SuperadminUsersRepository

    try {
      const users = await repo.getActiveSuperadminUsers()
      return ctx.ok({ data: users })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
