import type { Context } from 'hono'
import { z } from 'zod'
import {
  condominiumServiceCreateSchema,
  condominiumServiceUpdateSchema,
  condominiumServicesQuerySchema,
  type TCondominiumService,
  type TCondominiumServiceCreate,
  type TCondominiumServiceUpdate,
  type TCondominiumServicesQuerySchema,
  ESystemRole,
} from '@packages/domain'
import type { CondominiumServicesRepository, CondominiumsRepository, CurrenciesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { ManagementCompanyIdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { CreateCondominiumServiceService } from '@src/services/condominium-services/create-condominium-service.service'
import { CreateDefaultServicesService } from '@src/services/condominium-services/create-default-services.service'
import { CONDOMINIUM_ID_PROP } from '@src/http/middlewares/utils/auth/require-role'

// ─────────────────────────────────────────────────────────────────────────────
// Param Schemas
// ─────────────────────────────────────────────────────────────────────────────

const ServiceIdParamSchema = z.object({
  managementCompanyId: z.string().uuid(),
  serviceId: z.string().uuid(),
})

type TServiceIdParam = z.infer<typeof ServiceIdParamSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────────────────────

const allMcRoles = [ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.VIEWER] as const
const adminOnly = [ESystemRole.ADMIN] as const

// ─────────────────────────────────────────────────────────────────────────────
// Types for constructor dependencies
// ─────────────────────────────────────────────────────────────────────────────

type TCondominiumMCRepo = {
  getByCondominiumAndMC: (condominiumId: string, mcId: string) => Promise<{ id: string } | null>
}

export interface IMcCondominiumServicesDeps {
  servicesRepo: CondominiumServicesRepository
  condominiumsRepo: CondominiumsRepository
  currenciesRepo: CurrenciesRepository
  condominiumMCRepo: TCondominiumMCRepo
}

export class McCondominiumServicesController extends BaseController<
  TCondominiumService,
  TCondominiumServiceCreate,
  TCondominiumServiceUpdate
> {
  private readonly createService: CreateCondominiumServiceService
  private readonly createDefaultsService: CreateDefaultServicesService
  private readonly servicesRepo: CondominiumServicesRepository

  constructor(deps: IMcCondominiumServicesDeps) {
    super(deps.servicesRepo)
    this.servicesRepo = deps.servicesRepo

    this.createService = new CreateCondominiumServiceService(
      deps.servicesRepo,
      deps.condominiumsRepo,
      deps.currenciesRepo,
      deps.condominiumMCRepo
    )

    this.createDefaultsService = new CreateDefaultServicesService(
      deps.servicesRepo,
      deps.currenciesRepo
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      // ── List (paginated) ────────────────────────────────────────────
      {
        method: 'get',
        path: '/:managementCompanyId/me/condominium-services',
        handler: this.listServices,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(...allMcRoles),
          queryValidator(condominiumServicesQuerySchema),
        ],
      },
      // ── Get by ID ──────────────────────────────────────────────────
      {
        method: 'get',
        path: '/:managementCompanyId/me/condominium-services/:serviceId',
        handler: this.getService,
        middlewares: [
          authMiddleware,
          paramsValidator(ServiceIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      // ── Create ─────────────────────────────────────────────────────
      {
        method: 'post',
        path: '/:managementCompanyId/me/condominium-services',
        handler: this.createServiceHandler,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(condominiumServiceCreateSchema),
        ],
      },
      // ── Update ─────────────────────────────────────────────────────
      {
        method: 'patch',
        path: '/:managementCompanyId/me/condominium-services/:serviceId',
        handler: this.updateService,
        middlewares: [
          authMiddleware,
          paramsValidator(ServiceIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(condominiumServiceUpdateSchema),
        ],
      },
      // ── Deactivate ─────────────────────────────────────────────────
      {
        method: 'patch',
        path: '/:managementCompanyId/me/condominium-services/:serviceId/deactivate',
        handler: this.deactivateService,
        middlewares: [
          authMiddleware,
          paramsValidator(ServiceIdParamSchema),
          requireRole(...adminOnly),
        ],
      },
      // ── Create defaults ────────────────────────────────────────────
      {
        method: 'post',
        path: '/:managementCompanyId/me/condominium-services/defaults',
        handler: this.createDefaults,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(z.object({ currencyId: z.string().uuid() })),
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  private listServices = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TCondominiumServicesQuerySchema, { managementCompanyId: string }>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    try {
      if (!condominiumId) {
        return ctx.badRequest({ error: 'Condominium ID is required (x-condominium-id header)' })
      }

      const result = await this.servicesRepo.listByCondominiumPaginated(condominiumId, ctx.query)
      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getService = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TServiceIdParam>(c)

    try {
      const service = await this.servicesRepo.getById(ctx.params.serviceId)
      if (!service) {
        return ctx.notFound({ error: 'Service not found' })
      }
      return ctx.ok({ data: service })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createServiceHandler = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCondominiumServiceCreate, unknown, { managementCompanyId: string }>(c)
    const user = ctx.getAuthenticatedUser()
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    try {
      const result = await this.createService.execute({
        ...ctx.body,
        condominiumId: condominiumId || ctx.body.condominiumId,
        managementCompanyId: ctx.params.managementCompanyId,
        createdBy: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private updateService = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCondominiumServiceUpdate, unknown, TServiceIdParam>(c)

    try {
      const service = await this.servicesRepo.update(ctx.params.serviceId, ctx.body)
      if (!service) {
        return ctx.notFound({ error: 'Service not found' })
      }
      return ctx.ok({ data: service })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private deactivateService = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TServiceIdParam>(c)

    try {
      const service = await this.servicesRepo.update(ctx.params.serviceId, { isActive: false } as TCondominiumServiceUpdate)
      if (!service) {
        return ctx.notFound({ error: 'Service not found' })
      }
      return ctx.ok({ data: service })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createDefaults = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<{ currencyId: string }, unknown, { managementCompanyId: string }>(c)
    const user = ctx.getAuthenticatedUser()
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    try {
      if (!condominiumId) {
        return ctx.badRequest({ error: 'Condominium ID is required (x-condominium-id header)' })
      }

      const result = await this.createDefaultsService.execute(
        condominiumId,
        ctx.body.currencyId,
        user.id
      )

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
