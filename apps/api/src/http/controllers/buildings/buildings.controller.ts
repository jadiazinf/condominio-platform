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
import { IdParamSchema, CodeParamSchema, type TCodeParam } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

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
  constructor(repository: BuildingsRepository) {
    super(repository)
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
    const repo = this.repository as BuildingsRepository

    try {
      const buildings = await repo.getByCondominiumId(ctx.params.condominiumId)
      return ctx.ok({ data: buildings })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByCondominiumAndCode(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCondominiumAndCodeParam>(c)
    const repo = this.repository as BuildingsRepository

    try {
      const building = await repo.getByCondominiumAndCode(ctx.params.condominiumId, ctx.params.code)

      if (!building) {
        return ctx.notFound({ error: 'Building not found' })
      }

      return ctx.ok({ data: building })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
