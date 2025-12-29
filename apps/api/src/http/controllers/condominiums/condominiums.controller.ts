import type { Context } from 'hono'
import {
  condominiumCreateSchema,
  condominiumUpdateSchema,
  type TCondominium,
  type TCondominiumCreate,
  type TCondominiumUpdate,
} from '@packages/domain'
import type { CondominiumsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema, CodeParamSchema, type TCodeParam } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const ManagementCompanyIdParamSchema = z.object({
  managementCompanyId: z.string().uuid('Invalid management company ID format'),
})

type TManagementCompanyIdParam = z.infer<typeof ManagementCompanyIdParamSchema>

const LocationIdParamSchema = z.object({
  locationId: z.string().uuid('Invalid location ID format'),
})

type TLocationIdParam = z.infer<typeof LocationIdParamSchema>

/**
 * Controller for managing condominium resources.
 *
 * Endpoints:
 * - GET    /                                    List all condominiums
 * - GET    /code/:code                          Get by code
 * - GET    /management-company/:managementCompanyId  Get by management company
 * - GET    /location/:locationId                Get by location
 * - GET    /:id                                 Get by ID
 * - POST   /                                    Create condominium
 * - PATCH  /:id                                 Update condominium
 * - DELETE /:id                                 Delete condominium
 */
export class CondominiumsController extends BaseController<
  TCondominium,
  TCondominiumCreate,
  TCondominiumUpdate
> {
  constructor(repository: CondominiumsRepository) {
    super(repository)
    this.getByCode = this.getByCode.bind(this)
    this.getByManagementCompanyId = this.getByManagementCompanyId.bind(this)
    this.getByLocationId = this.getByLocationId.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/code/:code',
        handler: this.getByCode,
        middlewares: [authMiddleware, paramsValidator(CodeParamSchema)],
      },
      {
        method: 'get',
        path: '/management-company/:managementCompanyId',
        handler: this.getByManagementCompanyId,
        middlewares: [authMiddleware, paramsValidator(ManagementCompanyIdParamSchema)],
      },
      {
        method: 'get',
        path: '/location/:locationId',
        handler: this.getByLocationId,
        middlewares: [authMiddleware, paramsValidator(LocationIdParamSchema)],
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
        middlewares: [authMiddleware, bodyValidator(condominiumCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(condominiumUpdateSchema),
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

  private async getByCode(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCodeParam>(c)
    const repo = this.repository as CondominiumsRepository

    try {
      const condominium = await repo.getByCode(ctx.params.code)

      if (!condominium) {
        return ctx.notFound({ error: 'Condominium not found' })
      }

      return ctx.ok({ data: condominium })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByManagementCompanyId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TManagementCompanyIdParam>(c)
    const repo = this.repository as CondominiumsRepository

    try {
      const condominiums = await repo.getByManagementCompanyId(ctx.params.managementCompanyId)
      return ctx.ok({ data: condominiums })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByLocationId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TLocationIdParam>(c)
    const repo = this.repository as CondominiumsRepository

    try {
      const condominiums = await repo.getByLocationId(ctx.params.locationId)
      return ctx.ok({ data: condominiums })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
