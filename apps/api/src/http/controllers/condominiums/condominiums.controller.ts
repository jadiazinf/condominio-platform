import type { Context } from 'hono'
import {
  condominiumCreateSchema,
  condominiumUpdateSchema,
  condominiumsQuerySchema,
  type TCondominium,
  type TCondominiumCreate,
  type TCondominiumUpdate,
  type TCondominiumsQuerySchema,
} from '@packages/domain'
import type { CondominiumsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema, CodeParamSchema, type TCodeParam } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetCondominiumByCodeService,
  GetCondominiumsByManagementCompanyService,
  GetCondominiumsByLocationService,
  GenerateCondominiumCodeService,
} from '@src/services/condominiums'

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
  private readonly getCondominiumByCodeService: GetCondominiumByCodeService
  private readonly getCondominiumsByManagementCompanyService: GetCondominiumsByManagementCompanyService
  private readonly getCondominiumsByLocationService: GetCondominiumsByLocationService
  private readonly generateCondominiumCodeService: GenerateCondominiumCodeService

  constructor(repository: CondominiumsRepository) {
    super(repository)

    // Initialize services
    this.getCondominiumByCodeService = new GetCondominiumByCodeService(repository)
    this.getCondominiumsByManagementCompanyService = new GetCondominiumsByManagementCompanyService(
      repository
    )
    this.getCondominiumsByLocationService = new GetCondominiumsByLocationService(repository)
    this.generateCondominiumCodeService = new GenerateCondominiumCodeService(repository)

    this.listPaginated = this.listPaginated.bind(this)
    this.getByCode = this.getByCode.bind(this)
    this.getByManagementCompanyId = this.getByManagementCompanyId.bind(this)
    this.getByLocationId = this.getByLocationId.bind(this)
    this.generateCode = this.generateCode.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listPaginated,
        middlewares: [authMiddleware, queryValidator(condominiumsQuerySchema)],
      },
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
        path: '/generate-code',
        handler: this.generateCode,
        middlewares: [authMiddleware],
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

  private async listPaginated(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TCondominiumsQuerySchema>(c)
    const repo = this.repository as CondominiumsRepository
    const result = await repo.listPaginated(ctx.query)
    return ctx.ok(result)
  }

  private async getByCode(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCodeParam>(c)

    try {
      const result = await this.getCondominiumByCodeService.execute({
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

  private async getByManagementCompanyId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TManagementCompanyIdParam>(c)

    try {
      const result = await this.getCondominiumsByManagementCompanyService.execute({
        managementCompanyId: ctx.params.managementCompanyId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByLocationId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TLocationIdParam>(c)

    try {
      const result = await this.getCondominiumsByLocationService.execute({
        locationId: ctx.params.locationId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async generateCode(c: Context): Promise<Response> {
    const ctx = this.ctx(c)

    try {
      const result = await this.generateCondominiumCodeService.execute()

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
