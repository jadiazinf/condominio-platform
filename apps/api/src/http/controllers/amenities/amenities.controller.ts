import type { Context } from 'hono'
import {
  amenityCreateSchema,
  amenityUpdateSchema,
  type TAmenity,
  type TAmenityCreate,
  type TAmenityUpdate,
  ESystemRole,
} from '@packages/domain'
import type { AmenitiesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'

/**
 * Controller for managing amenity resources.
 *
 * Endpoints:
 * - GET    /        List amenities (scoped by condominium from context)
 * - GET    /:id     Get by ID
 * - POST   /        Create amenity (condominiumId injected from context)
 * - PATCH  /:id     Update amenity
 * - DELETE /:id     Delete amenity (soft)
 */
export class AmenitiesController extends BaseController<
  TAmenity,
  TAmenityCreate,
  TAmenityUpdate
> {
  constructor(repository: AmenitiesRepository) {
    super(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT, ESystemRole.USER)] },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), bodyValidator(amenityCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(amenityUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Overridden Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const repo = this.repository as AmenitiesRepository

    const amenities = await repo.getByCondominiumId(condominiumId)

    return ctx.ok({ data: amenities })
  }

  protected override create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TAmenityCreate>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const entity = await this.repository.create({ ...ctx.body, condominiumId })
    return ctx.created({ data: entity })
  }
}
