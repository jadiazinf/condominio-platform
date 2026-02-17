import type { Context } from 'hono'
import {
  locationCreateSchema,
  locationUpdateSchema,
  ELocationTypes,
  type TLocation,
  type TLocationCreate,
  type TLocationUpdate,
  type TLocationType,
} from '@packages/domain'
import type { LocationsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { z } from 'zod'

const LocationTypeParamSchema = z.object({
  type: z.enum(ELocationTypes),
})

type TLocationTypeParam = z.infer<typeof LocationTypeParamSchema>

const ParentIdParamSchema = z.object({
  parentId: z.string().uuid('Invalid parent ID format'),
})

type TParentIdParam = z.infer<typeof ParentIdParamSchema>

/**
 * Controller for managing location resources (countries, provinces, cities).
 *
 * Endpoints:
 * - GET    /                    List all locations
 * - GET    /type/:type          Get locations by type
 * - GET    /parent/:parentId    Get locations by parent ID
 * - GET    /:id                 Get location by ID
 * - POST   /                    Create location
 * - PATCH  /:id                 Update location
 * - DELETE /:id                 Delete location
 */
export class LocationsController extends BaseController<
  TLocation,
  TLocationCreate,
  TLocationUpdate
> {
  constructor(repository: LocationsRepository) {
    super(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/type/:type',
        handler: this.getByType,
        middlewares: [authMiddleware, paramsValidator(LocationTypeParamSchema)],
      },
      {
        method: 'get',
        path: '/parent/:parentId',
        handler: this.getByParentId,
        middlewares: [authMiddleware, paramsValidator(ParentIdParamSchema)],
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
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), bodyValidator(locationCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema), bodyValidator(locationUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByType = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TLocationTypeParam>(c)
    const repo = this.repository as LocationsRepository

    try {
      const locations = await repo.getByType(ctx.params.type as TLocationType)
      return ctx.ok({ data: locations })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByParentId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TParentIdParam>(c)
    const repo = this.repository as LocationsRepository

    try {
      const locations = await repo.getByParentId(ctx.params.parentId)
      return ctx.ok({ data: locations })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
