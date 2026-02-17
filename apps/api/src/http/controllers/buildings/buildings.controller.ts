import type { Context } from 'hono'
import {
  buildingCreateSchema,
  buildingUpdateSchema,
  type TBuilding,
  type TBuildingCreate,
  type TBuildingUpdate,
} from '@packages/domain'
import type { BuildingsRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetBuildingsByCondominiumService,
  GetBuildingByCondominiumAndCodeService,
} from '@src/services/buildings'
import { BulkCreateBuildingsService } from '@src/services/buildings'

const CodeParamSchema = z.object({
  code: z.string().min(1),
})

const buildingBulkCreateSchema = z.object({
  buildings: z.array(buildingCreateSchema.omit({ condominiumId: true })).min(1),
})

type TCodeParam = z.infer<typeof CodeParamSchema>

/**
 * Controller for managing building resources.
 *
 * Endpoints:
 * - GET    /                List buildings (scoped by condominium from context)
 * - GET    /code/:code      Get by condominium (context) and code
 * - GET    /:id             Get by ID
 * - POST   /                Create building (condominiumId injected from context)
 * - PATCH  /:id             Update building
 * - DELETE /:id             Delete building
 */
export class BuildingsController extends BaseController<
  TBuilding,
  TBuildingCreate,
  TBuildingUpdate
> {
  private readonly getBuildingsByCondominiumService: GetBuildingsByCondominiumService
  private readonly getBuildingByCondominiumAndCodeService: GetBuildingByCondominiumAndCodeService
  private readonly bulkCreateService: BulkCreateBuildingsService

  constructor(repository: BuildingsRepository, db: TDrizzleClient) {
    super(repository)

    // Initialize services
    this.getBuildingsByCondominiumService = new GetBuildingsByCondominiumService(repository)
    this.getBuildingByCondominiumAndCodeService = new GetBuildingByCondominiumAndCodeService(
      repository
    )
    this.bulkCreateService = new BulkCreateBuildingsService(db, repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT')] },
      {
        method: 'get',
        path: '/code/:code',
        handler: this.getByCondominiumAndCode,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT'), paramsValidator(CodeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT', 'USER'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/bulk',
        handler: this.bulkCreate,
        middlewares: [authMiddleware, requireRole('SUPERADMIN', 'ADMIN'), bodyValidator(buildingBulkCreateSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('SUPERADMIN', 'ADMIN'), bodyValidator(buildingCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole('SUPERADMIN', 'ADMIN'),
          paramsValidator(IdParamSchema),
          bodyValidator(buildingUpdateSchema),
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

    const result = await this.getBuildingsByCondominiumService.execute({ condominiumId })

    if (!result.success) {
      return ctx.internalError({ error: result.error })
    }

    return ctx.ok({ data: result.data })
  }

  protected override create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TBuildingCreate>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const entity = await this.repository.create({ ...ctx.body, condominiumId })
    return ctx.created({ data: entity })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private bulkCreate = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof buildingBulkCreateSchema>>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    const result = await this.bulkCreateService.execute({
      condominiumId,
      buildings: ctx.body.buildings,
    })

    if (!result.success) {
      return ctx.internalError({ error: result.error })
    }

    return ctx.created({ data: result.data })
  }

  private getByCondominiumAndCode = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TCodeParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    try {
      const result = await this.getBuildingByCondominiumAndCodeService.execute({
        condominiumId,
        code: ctx.params.code,
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
