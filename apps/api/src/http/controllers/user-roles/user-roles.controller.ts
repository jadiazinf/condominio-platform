import type { Context } from 'hono'
import {
  userRoleCreateSchema,
  userRoleUpdateSchema,
  type TUserRole,
  type TUserRoleCreate,
  type TUserRoleUpdate,
} from '@packages/domain'
import type { UserRolesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

const UserAndCondominiumParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  condominiumId: z.string().uuid('Invalid condominium ID format'),
})

type TUserAndCondominiumParam = z.infer<typeof UserAndCondominiumParamSchema>

const UserAndBuildingParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  buildingId: z.string().uuid('Invalid building ID format'),
})

type TUserAndBuildingParam = z.infer<typeof UserAndBuildingParamSchema>

const CheckRoleQuerySchema = z.object({
  roleId: z.string().uuid('Invalid role ID format'),
  condominiumId: z.string().uuid('Invalid condominium ID format').optional(),
  buildingId: z.string().uuid('Invalid building ID format').optional(),
})

type TCheckRoleQuery = z.infer<typeof CheckRoleQuerySchema>

/**
 * Controller for managing user-role assignments.
 *
 * Endpoints:
 * - GET    /                                            List all user-roles
 * - GET    /user/:userId                                Get by user
 * - GET    /user/:userId/global                         Get global roles for user
 * - GET    /user/:userId/condominium/:condominiumId     Get by user and condominium
 * - GET    /user/:userId/building/:buildingId           Get by user and building
 * - GET    /user/:userId/has-role                       Check if user has role (query params)
 * - GET    /:id                                         Get by ID
 * - POST   /                                            Create user-role
 * - PATCH  /:id                                         Update user-role
 * - DELETE /:id                                         Delete user-role (hard delete)
 */
export class UserRolesController extends BaseController<
  TUserRole,
  TUserRoleCreate,
  TUserRoleUpdate
> {
  constructor(repository: UserRolesRepository) {
    super(repository)
    this.getByUserId = this.getByUserId.bind(this)
    this.getGlobalRolesByUser = this.getGlobalRolesByUser.bind(this)
    this.getByUserAndCondominium = this.getByUserAndCondominium.bind(this)
    this.getByUserAndBuilding = this.getByUserAndBuilding.bind(this)
    this.checkUserHasRole = this.checkUserHasRole.bind(this)
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
        path: '/user/:userId/global',
        handler: this.getGlobalRolesByUser,
        middlewares: [paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/condominium/:condominiumId',
        handler: this.getByUserAndCondominium,
        middlewares: [paramsValidator(UserAndCondominiumParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/building/:buildingId',
        handler: this.getByUserAndBuilding,
        middlewares: [paramsValidator(UserAndBuildingParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/has-role',
        handler: this.checkUserHasRole,
        middlewares: [paramsValidator(UserIdParamSchema), queryValidator(CheckRoleQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [bodyValidator(userRoleCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(userRoleUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as UserRolesRepository

    try {
      const userRoles = await repo.getByUserId(ctx.params.userId)
      return ctx.ok({ data: userRoles })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getGlobalRolesByUser(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as UserRolesRepository

    try {
      const userRoles = await repo.getGlobalRolesByUser(ctx.params.userId)
      return ctx.ok({ data: userRoles })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUserAndCondominium(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserAndCondominiumParam>(c)
    const repo = this.repository as UserRolesRepository

    try {
      const userRoles = await repo.getByUserAndCondominium(
        ctx.params.userId,
        ctx.params.condominiumId
      )
      return ctx.ok({ data: userRoles })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUserAndBuilding(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserAndBuildingParam>(c)
    const repo = this.repository as UserRolesRepository

    try {
      const userRoles = await repo.getByUserAndBuilding(ctx.params.userId, ctx.params.buildingId)
      return ctx.ok({ data: userRoles })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async checkUserHasRole(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TCheckRoleQuery, TUserIdParam>(c)
    const repo = this.repository as UserRolesRepository

    try {
      const hasRole = await repo.userHasRole(
        ctx.params.userId,
        ctx.query.roleId,
        ctx.query.condominiumId,
        ctx.query.buildingId
      )
      return ctx.ok({ data: { hasRole } })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
