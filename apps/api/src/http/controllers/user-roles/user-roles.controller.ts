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
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetRolesByUserService,
  GetGlobalRolesByUserService,
  GetRolesByUserAndCondominiumService,
  GetRolesByUserAndBuildingService,
  CheckUserHasRoleService,
} from '@src/services/user-roles'

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
  private readonly getRolesByUserService: GetRolesByUserService
  private readonly getGlobalRolesByUserService: GetGlobalRolesByUserService
  private readonly getRolesByUserAndCondominiumService: GetRolesByUserAndCondominiumService
  private readonly getRolesByUserAndBuildingService: GetRolesByUserAndBuildingService
  private readonly checkUserHasRoleService: CheckUserHasRoleService

  constructor(repository: UserRolesRepository) {
    super(repository)

    // Initialize services
    this.getRolesByUserService = new GetRolesByUserService(repository)
    this.getGlobalRolesByUserService = new GetGlobalRolesByUserService(repository)
    this.getRolesByUserAndCondominiumService = new GetRolesByUserAndCondominiumService(repository)
    this.getRolesByUserAndBuildingService = new GetRolesByUserAndBuildingService(repository)
    this.checkUserHasRoleService = new CheckUserHasRoleService(repository)

    this.getByUserId = this.getByUserId.bind(this)
    this.getGlobalRolesByUser = this.getGlobalRolesByUser.bind(this)
    this.getByUserAndCondominium = this.getByUserAndCondominium.bind(this)
    this.getByUserAndBuilding = this.getByUserAndBuilding.bind(this)
    this.checkUserHasRole = this.checkUserHasRole.bind(this)
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
        path: '/user/:userId/global',
        handler: this.getGlobalRolesByUser,
        middlewares: [authMiddleware, paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/condominium/:condominiumId',
        handler: this.getByUserAndCondominium,
        middlewares: [authMiddleware, paramsValidator(UserAndCondominiumParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/building/:buildingId',
        handler: this.getByUserAndBuilding,
        middlewares: [authMiddleware, paramsValidator(UserAndBuildingParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/has-role',
        handler: this.checkUserHasRole,
        middlewares: [
          authMiddleware,
          paramsValidator(UserIdParamSchema),
          queryValidator(CheckRoleQuerySchema),
        ],
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
        middlewares: [authMiddleware, bodyValidator(userRoleCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(userRoleUpdateSchema),
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

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.getRolesByUserService.execute({
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

  private async getGlobalRolesByUser(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.getGlobalRolesByUserService.execute({
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

  private async getByUserAndCondominium(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserAndCondominiumParam>(c)

    try {
      const result = await this.getRolesByUserAndCondominiumService.execute({
        userId: ctx.params.userId,
        condominiumId: ctx.params.condominiumId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUserAndBuilding(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserAndBuildingParam>(c)

    try {
      const result = await this.getRolesByUserAndBuildingService.execute({
        userId: ctx.params.userId,
        buildingId: ctx.params.buildingId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async checkUserHasRole(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TCheckRoleQuery, TUserIdParam>(c)

    try {
      const result = await this.checkUserHasRoleService.execute({
        userId: ctx.params.userId,
        roleId: ctx.query.roleId,
        condominiumId: ctx.query.condominiumId,
        buildingId: ctx.query.buildingId,
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
