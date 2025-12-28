import type { Context } from 'hono'
import {
  unitOwnershipCreateSchema,
  unitOwnershipUpdateSchema,
  type TUnitOwnership,
  type TUnitOwnershipCreate,
  type TUnitOwnershipUpdate,
} from '@packages/domain'
import type { UnitOwnershipsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const UnitIdParamSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID format'),
})

type TUnitIdParam = z.infer<typeof UnitIdParamSchema>

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

const UnitAndUserParamSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID format'),
  userId: z.string().uuid('Invalid user ID format'),
})

type TUnitAndUserParam = z.infer<typeof UnitAndUserParamSchema>

/**
 * Controller for managing unit ownership resources.
 *
 * Endpoints:
 * - GET    /                              List all unit ownerships
 * - GET    /unit/:unitId                  Get by unit
 * - GET    /user/:userId                  Get by user
 * - GET    /user/:userId/primary          Get primary residence for user
 * - GET    /unit/:unitId/user/:userId     Get by unit and user
 * - GET    /:id                           Get by ID
 * - POST   /                              Create unit ownership
 * - PATCH  /:id                           Update unit ownership
 * - DELETE /:id                           Delete unit ownership
 */
export class UnitOwnershipsController extends BaseController<
  TUnitOwnership,
  TUnitOwnershipCreate,
  TUnitOwnershipUpdate
> {
  constructor(repository: UnitOwnershipsRepository) {
    super(repository)
    this.getByUnitId = this.getByUnitId.bind(this)
    this.getByUserId = this.getByUserId.bind(this)
    this.getByUnitAndUser = this.getByUnitAndUser.bind(this)
    this.getPrimaryResidenceByUser = this.getPrimaryResidenceByUser.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/primary',
        handler: this.getPrimaryResidenceByUser,
        middlewares: [paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/unit/:unitId/user/:userId',
        handler: this.getByUnitAndUser,
        middlewares: [paramsValidator(UnitAndUserParamSchema)],
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
        middlewares: [bodyValidator(unitOwnershipCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(unitOwnershipUpdateSchema)],
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

  private async getByUnitId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownerships = await repo.getByUnitId(ctx.params.unitId)
      return ctx.ok({ data: ownerships })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownerships = await repo.getByUserId(ctx.params.userId)
      return ctx.ok({ data: ownerships })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUnitAndUser(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUnitAndUserParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownership = await repo.getByUnitAndUser(ctx.params.unitId, ctx.params.userId)

      if (!ownership) {
        return ctx.notFound({ error: 'Unit ownership not found' })
      }

      return ctx.ok({ data: ownership })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getPrimaryResidenceByUser(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownership = await repo.getPrimaryResidenceByUser(ctx.params.userId)

      if (!ownership) {
        return ctx.notFound({ error: 'No primary residence found for user' })
      }

      return ctx.ok({ data: ownership })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
