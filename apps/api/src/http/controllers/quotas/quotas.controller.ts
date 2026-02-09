import type { Context } from 'hono'
import {
  quotaCreateSchema,
  quotaUpdateSchema,
  type TQuota,
  type TQuotaCreate,
  type TQuotaUpdate,
} from '@packages/domain'
import type { QuotasRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetQuotasByUnitService,
  GetPendingQuotasByUnitService,
  GetQuotasByStatusService,
  GetOverdueQuotasService,
  GetQuotasByPeriodService,
} from '@src/services/quotas'

const UnitIdParamSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID format'),
})

type TUnitIdParam = z.infer<typeof UnitIdParamSchema>

const StatusParamSchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']),
})

type TStatusParam = z.infer<typeof StatusParamSchema>

const DateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

type TDateParam = z.infer<typeof DateParamSchema>

const PeriodQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
})

type TPeriodQuery = z.infer<typeof PeriodQuerySchema>

/**
 * Controller for managing quota resources.
 *
 * Endpoints:
 * - GET    /                       List all quotas
 * - GET    /unit/:unitId           Get by unit
 * - GET    /unit/:unitId/pending   Get pending quotas for unit
 * - GET    /status/:status         Get by status
 * - GET    /overdue/:date          Get overdue quotas as of date
 * - GET    /period                 Get by period (query: year, month)
 * - GET    /:id                    Get by ID
 * - POST   /                       Create quota
 * - PATCH  /:id                    Update quota
 * - DELETE /:id                    Cancel quota
 */
export class QuotasController extends BaseController<TQuota, TQuotaCreate, TQuotaUpdate> {
  private readonly getQuotasByUnitService: GetQuotasByUnitService
  private readonly getPendingQuotasByUnitService: GetPendingQuotasByUnitService
  private readonly getQuotasByStatusService: GetQuotasByStatusService
  private readonly getOverdueQuotasService: GetOverdueQuotasService
  private readonly getQuotasByPeriodService: GetQuotasByPeriodService

  constructor(repository: QuotasRepository) {
    super(repository)

    // Initialize services
    this.getQuotasByUnitService = new GetQuotasByUnitService(repository)
    this.getPendingQuotasByUnitService = new GetPendingQuotasByUnitService(repository)
    this.getQuotasByStatusService = new GetQuotasByStatusService(repository)
    this.getOverdueQuotasService = new GetOverdueQuotasService(repository)
    this.getQuotasByPeriodService = new GetQuotasByPeriodService(repository)

  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT')] },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT', 'USER'), paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/unit/:unitId/pending',
        handler: this.getPendingByUnit,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT', 'USER'), paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/status/:status',
        handler: this.getByStatus,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(StatusParamSchema)],
      },
      {
        method: 'get',
        path: '/overdue/:date',
        handler: this.getOverdue,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(DateParamSchema)],
      },
      {
        method: 'get',
        path: '/period',
        handler: this.getByPeriod,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), queryValidator(PeriodQuerySchema)],
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
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), bodyValidator(quotaCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole('ADMIN', 'ACCOUNTANT'),
          paramsValidator(IdParamSchema),
          bodyValidator(quotaUpdateSchema),
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
    // TODO: Filter by condominiumId via JOIN through unit → building.condominiumId
    const entities = await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByUnitId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)

    try {
      const result = await this.getQuotasByUnitService.execute({
        unitId: ctx.params.unitId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getPendingByUnit = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)

    try {
      const result = await this.getPendingQuotasByUnitService.execute({
        unitId: ctx.params.unitId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByStatus = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TStatusParam>(c)

    try {
      const result = await this.getQuotasByStatusService.execute({
        status: ctx.params.status,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getOverdue = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TDateParam>(c)

    try {
      const result = await this.getOverdueQuotasService.execute({
        asOfDate: ctx.params.date,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByPeriod = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TPeriodQuery>(c)

    try {
      const result = await this.getQuotasByPeriodService.execute({
        year: ctx.query.year,
        month: ctx.query.month,
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
