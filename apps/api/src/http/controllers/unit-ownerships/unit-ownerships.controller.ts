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
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
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
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT')] },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'USER'), paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId/primary',
        handler: this.getPrimaryResidenceByUser,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'USER'), paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/unit/:unitId/user/:userId',
        handler: this.getByUnitAndUser,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(UnitAndUserParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'USER'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('ADMIN'), bodyValidator(unitOwnershipCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(IdParamSchema), bodyValidator(unitOwnershipUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Overridden Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    // TODO: Filter by condominiumId via JOIN through unit → building.condominiumId
    const entities = await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByUnitId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownerships = await repo.getByUnitId(ctx.params.unitId)
      return ctx.ok({ data: ownerships })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownerships = await repo.getByUserId(ctx.params.userId)
      return ctx.ok({ data: ownerships })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByUnitAndUser = async (c: Context): Promise<Response> => {
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

  private getPrimaryResidenceByUser = async (c: Context): Promise<Response> => {
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
