import type { Context } from 'hono'
import {
  buildingCreateSchema,
  buildingUpdateSchema,
  type TBuilding,
  type TBuildingCreate,
  type TBuildingUpdate,
} from '@packages/domain'
import type { BuildingsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetBuildingsByCondominiumService,
  GetBuildingByCondominiumAndCodeService,
} from '@src/services/buildings'

const CondominiumIdParamSchema = z.object({
  condominiumId: z.string().uuid('Invalid condominium ID format'),
})

type TCondominiumIdParam = z.infer<typeof CondominiumIdParamSchema>

const CondominiumAndCodeParamSchema = z.object({
  condominiumId: z.string().uuid('Invalid condominium ID format'),
  code: z.string().min(1),
})

type TCondominiumAndCodeParam = z.infer<typeof CondominiumAndCodeParamSchema>

/**
 * Controller for managing building resources.
 *
 * Endpoints:
 * - GET    /                                      List all buildings
 * - GET    /condominium/:condominiumId            Get by condominium
 * - GET    /condominium/:condominiumId/code/:code Get by condominium and code
 * - GET    /:id                                   Get by ID
 * - POST   /                                      Create building
 * - PATCH  /:id                                   Update building
 * - DELETE /:id                                   Delete building
 */
export class BuildingsController extends BaseController<
  TBuilding,
  TBuildingCreate,
  TBuildingUpdate
> {
  private readonly getBuildingsByCondominiumService: GetBuildingsByCondominiumService
  private readonly getBuildingByCondominiumAndCodeService: GetBuildingByCondominiumAndCodeService

  constructor(repository: BuildingsRepository) {
    super(repository)

    // Initialize services
    this.getBuildingsByCondominiumService = new GetBuildingsByCondominiumService(repository)
    this.getBuildingByCondominiumAndCodeService = new GetBuildingByCondominiumAndCodeService(repository)

    this.getByCondominiumId = this.getByCondominiumId.bind(this)
    this.getByCondominiumAndCode = this.getByCondominiumAndCode.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/condominium/:condominiumId',
        handler: this.getByCondominiumId,
        middlewares: [authMiddleware, paramsValidator(CondominiumIdParamSchema)],
      },
      {
        method: 'get',
        path: '/condominium/:condominiumId/code/:code',
        handler: this.getByCondominiumAndCode,
        middlewares: [authMiddleware, paramsValidator(CondominiumAndCodeParamSchema)],
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
        middlewares: [authMiddleware, bodyValidator(buildingCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(buildingUpdateSchema),
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

  private async getByCondominiumId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCondominiumIdParam>(c)

    try {
      const result = await this.getBuildingsByCondominiumService.execute({
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

  private async getByCondominiumAndCode(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCondominiumAndCodeParam>(c)

    try {
      const result = await this.getBuildingByCondominiumAndCodeService.execute({
        condominiumId: ctx.params.condominiumId,
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
