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
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetUnitsByBuildingService,
  GetUnitByBuildingAndNumberService,
  GetUnitsByFloorService,
} from '@src/services/units'

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
  private readonly getUnitsByBuildingService: GetUnitsByBuildingService
  private readonly getUnitByBuildingAndNumberService: GetUnitByBuildingAndNumberService
  private readonly getUnitsByFloorService: GetUnitsByFloorService

  constructor(repository: UnitsRepository) {
    super(repository)

    // Initialize services
    this.getUnitsByBuildingService = new GetUnitsByBuildingService(repository)
    this.getUnitByBuildingAndNumberService = new GetUnitByBuildingAndNumberService(repository)
    this.getUnitsByFloorService = new GetUnitsByFloorService(repository)

  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT')] },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT'), paramsValidator(BuildingIdParamSchema)],
      },
      {
        method: 'get',
        path: '/building/:buildingId/number/:unitNumber',
        handler: this.getByBuildingAndNumber,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT'), paramsValidator(BuildingAndNumberParamSchema)],
      },
      {
        method: 'get',
        path: '/building/:buildingId/floor/:floor',
        handler: this.getByFloor,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT'), paramsValidator(BuildingAndFloorParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT', 'USER'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('ADMIN'), bodyValidator(unitCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole('ADMIN'),
          paramsValidator(IdParamSchema),
          bodyValidator(unitUpdateSchema),
        ],
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
    // TODO: Filter by condominiumId via JOIN through building.condominiumId
    const entities = await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByBuildingId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)

    try {
      const result = await this.getUnitsByBuildingService.execute({
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

  private getByBuildingAndNumber = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBuildingAndNumberParam>(c)

    try {
      const result = await this.getUnitByBuildingAndNumberService.execute({
        buildingId: ctx.params.buildingId,
        unitNumber: ctx.params.unitNumber,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByFloor = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBuildingAndFloorParam>(c)

    try {
      const result = await this.getUnitsByFloorService.execute({
        buildingId: ctx.params.buildingId,
        floor: ctx.params.floor,
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
