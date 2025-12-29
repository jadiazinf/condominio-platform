import type { Context } from 'hono'
import {
  unitCreateSchema,
  unitUpdateSchema,
  type TUnit,
  type TUnitCreate,
  type TUnitUpdate,
} from '@packages/domain'
import type { UnitsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const BuildingIdParamSchema = z.object({
  buildingId: z.string().uuid('Invalid building ID format'),
})

type TBuildingIdParam = z.infer<typeof BuildingIdParamSchema>

const BuildingAndNumberParamSchema = z.object({
  buildingId: z.string().uuid('Invalid building ID format'),
  unitNumber: z.string().min(1),
})

type TBuildingAndNumberParam = z.infer<typeof BuildingAndNumberParamSchema>

const BuildingAndFloorParamSchema = z.object({
  buildingId: z.string().uuid('Invalid building ID format'),
  floor: z.coerce.number().int(),
})

type TBuildingAndFloorParam = z.infer<typeof BuildingAndFloorParamSchema>

/**
 * Controller for managing unit resources.
 *
 * Endpoints:
 * - GET    /                                              List all units
 * - GET    /building/:buildingId                          Get by building
 * - GET    /building/:buildingId/number/:unitNumber       Get by building and unit number
 * - GET    /building/:buildingId/floor/:floor             Get by building and floor
 * - GET    /:id                                           Get by ID
 * - POST   /                                              Create unit
 * - PATCH  /:id                                           Update unit
 * - DELETE /:id                                           Delete unit
 */
export class UnitsController extends BaseController<TUnit, TUnitCreate, TUnitUpdate> {
  constructor(repository: UnitsRepository) {
    super(repository)
    this.getByBuildingId = this.getByBuildingId.bind(this)
    this.getByBuildingAndNumber = this.getByBuildingAndNumber.bind(this)
    this.getByFloor = this.getByFloor.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [authMiddleware, paramsValidator(BuildingIdParamSchema)],
      },
      {
        method: 'get',
        path: '/building/:buildingId/number/:unitNumber',
        handler: this.getByBuildingAndNumber,
        middlewares: [authMiddleware, paramsValidator(BuildingAndNumberParamSchema)],
      },
      {
        method: 'get',
        path: '/building/:buildingId/floor/:floor',
        handler: this.getByFloor,
        middlewares: [authMiddleware, paramsValidator(BuildingAndFloorParamSchema)],
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
        middlewares: [authMiddleware, bodyValidator(unitCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(unitUpdateSchema),
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

  private async getByBuildingId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)
    const repo = this.repository as UnitsRepository

    try {
      const units = await repo.getByBuildingId(ctx.params.buildingId)
      return ctx.ok({ data: units })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByBuildingAndNumber(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TBuildingAndNumberParam>(c)
    const repo = this.repository as UnitsRepository

    try {
      const unit = await repo.getByBuildingAndNumber(ctx.params.buildingId, ctx.params.unitNumber)

      if (!unit) {
        return ctx.notFound({ error: 'Unit not found' })
      }

      return ctx.ok({ data: unit })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByFloor(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TBuildingAndFloorParam>(c)
    const repo = this.repository as UnitsRepository

    try {
      const units = await repo.getByFloor(ctx.params.buildingId, ctx.params.floor)
      return ctx.ok({ data: units })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
