import type { Context } from 'hono'
import { z } from 'zod'
import { useTranslation } from '@intlify/hono'
import {
  condominiumServiceCreateSchema,
  condominiumServiceUpdateSchema,
  condominiumServicesQuerySchema,
  serviceExecutionCreateSchema,
  serviceExecutionUpdateSchema,
  type TCondominiumService,
  type TCondominiumServiceCreate,
  type TCondominiumServiceUpdate,
  type TCondominiumServicesQuerySchema,
  type TServiceExecutionCreate,
  type TServiceExecutionUpdate,
  ESystemRole,
} from '@packages/domain'
import type {
  CondominiumServicesRepository,
  CondominiumsRepository,
  ServiceExecutionsRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { ManagementCompanyIdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { CreateCondominiumServiceService } from '@src/services/condominium-services/create-condominium-service.service'
import { CreateDefaultServicesService } from '@src/services/condominium-services/create-default-services.service'
import { CONDOMINIUM_ID_PROP } from '@src/http/middlewares/utils/auth/require-role'
import { LocaleDictionary } from '@locales/dictionary'

// ─────────────────────────────────────────────────────────────────────────────
// Param Schemas
// ─────────────────────────────────────────────────────────────────────────────

const ServiceIdParamSchema = z.object({
  managementCompanyId: z.string().uuid(),
  serviceId: z.string().uuid(),
})

type TServiceIdParam = z.infer<typeof ServiceIdParamSchema>

const ExecutionIdParamSchema = z.object({
  managementCompanyId: z.string().uuid(),
  serviceId: z.string().uuid(),
  executionId: z.string().uuid(),
})

type TExecutionIdParam = z.infer<typeof ExecutionIdParamSchema>

const ExecutionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  conceptId: z.string().uuid().optional(),
})

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
  executionsRepo: ServiceExecutionsRepository
  condominiumsRepo: CondominiumsRepository
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
  private readonly executionsRepo: ServiceExecutionsRepository

  constructor(deps: IMcCondominiumServicesDeps) {
    super(deps.servicesRepo)
    this.servicesRepo = deps.servicesRepo
    this.executionsRepo = deps.executionsRepo

    this.createService = new CreateCondominiumServiceService(
      deps.servicesRepo,
      deps.condominiumsRepo,
      deps.condominiumMCRepo
    )

    this.createDefaultsService = new CreateDefaultServicesService(
      deps.servicesRepo
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
        ],
      },
      // ── Executions: List ────────────────────────────────────────────
      {
        method: 'get',
        path: '/:managementCompanyId/me/condominium-services/:serviceId/executions',
        handler: this.listExecutions,
        middlewares: [
          authMiddleware,
          paramsValidator(ServiceIdParamSchema),
          requireRole(...allMcRoles),
          queryValidator(ExecutionsQuerySchema),
        ],
      },
      // ── Executions: Get by ID ───────────────────────────────────────
      {
        method: 'get',
        path: '/:managementCompanyId/me/condominium-services/:serviceId/executions/:executionId',
        handler: this.getExecution,
        middlewares: [
          authMiddleware,
          paramsValidator(ExecutionIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      // ── Executions: Create ──────────────────────────────────────────
      {
        method: 'post',
        path: '/:managementCompanyId/me/condominium-services/:serviceId/executions',
        handler: this.createExecution,
        middlewares: [
          authMiddleware,
          paramsValidator(ServiceIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(serviceExecutionCreateSchema.omit({ serviceId: true, condominiumId: true })),
        ],
      },
      // ── Executions: Update ──────────────────────────────────────────
      {
        method: 'patch',
        path: '/:managementCompanyId/me/condominium-services/:serviceId/executions/:executionId',
        handler: this.updateExecution,
        middlewares: [
          authMiddleware,
          paramsValidator(ExecutionIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(serviceExecutionUpdateSchema),
        ],
      },
      // ── Executions: Delete ──────────────────────────────────────────
      {
        method: 'delete',
        path: '/:managementCompanyId/me/condominium-services/:serviceId/executions/:executionId',
        handler: this.deleteExecution,
        middlewares: [
          authMiddleware,
          paramsValidator(ExecutionIdParamSchema),
          requireRole(...adminOnly),
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers — Services
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
    const ctx = this.ctx<unknown, unknown, { managementCompanyId: string }>(c)
    const user = ctx.getAuthenticatedUser()
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    try {
      if (!condominiumId) {
        return ctx.badRequest({ error: 'Condominium ID is required (x-condominium-id header)' })
      }

      const result = await this.createDefaultsService.execute(
        condominiumId,
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

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers — Executions
  // ─────────────────────────────────────────────────────────────────────────

  private listExecutions = async (c: Context): Promise<Response> => {
    type TExecQuery = { page: number; limit: number; conceptId?: string }
    const ctx = this.ctx<unknown, TExecQuery, TServiceIdParam>(c)

    try {
      const service = await this.servicesRepo.getById(ctx.params.serviceId)
      if (!service) return ctx.notFound({ error: 'Service not found' })

      const result = await this.executionsRepo.getByServiceIdPaginated(ctx.params.serviceId, {
        page: ctx.query.page,
        limit: ctx.query.limit,
        conceptId: ctx.query.conceptId,
      })

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getExecution = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TExecutionIdParam>(c)

    try {
      const execution = await this.executionsRepo.getById(ctx.params.executionId)
      if (!execution || execution.serviceId !== ctx.params.serviceId) {
        return ctx.notFound({ error: 'Execution not found' })
      }
      return ctx.ok({ data: execution })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createExecution = async (c: Context): Promise<Response> => {
    type TExecBody = Omit<TServiceExecutionCreate, 'serviceId' | 'condominiumId'>
    const ctx = this.ctx<TExecBody, unknown, TServiceIdParam>(c)
    const user = ctx.getAuthenticatedUser()
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    try {
      const service = await this.servicesRepo.getById(ctx.params.serviceId)
      if (!service) return ctx.notFound({ error: 'Service not found' })

      if (!condominiumId) {
        return ctx.badRequest({ error: 'Condominium ID is required (x-condominium-id header)' })
      }

      const execution = await this.executionsRepo.create({
        ...ctx.body,
        serviceId: ctx.params.serviceId,
        condominiumId,
        paymentConceptId: (ctx.body as { paymentConceptId?: string }).paymentConceptId ?? null,
        createdBy: user.id,
      } as TServiceExecutionCreate)

      return ctx.created({ data: execution })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private updateExecution = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TServiceExecutionUpdate, unknown, TExecutionIdParam>(c)
    const t = useTranslation(c)

    try {
      const existing = await this.executionsRepo.getById(ctx.params.executionId)
      if (!existing || existing.serviceId !== ctx.params.serviceId) {
        return ctx.notFound({ error: t(LocaleDictionary.http.controllers.serviceExecutions.executionNotFound) })
      }

      const execution = await this.executionsRepo.update(ctx.params.executionId, ctx.body)
      if (!execution) return ctx.notFound({ error: t(LocaleDictionary.http.controllers.serviceExecutions.executionNotFound) })

      return ctx.ok({ data: execution })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private deleteExecution = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TExecutionIdParam>(c)

    try {
      const existing = await this.executionsRepo.getById(ctx.params.executionId)
      if (!existing || existing.serviceId !== ctx.params.serviceId) {
        return ctx.notFound({ error: 'Execution not found' })
      }

      await this.executionsRepo.hardDelete(ctx.params.executionId)
      return ctx.ok({ data: { id: ctx.params.executionId } })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
