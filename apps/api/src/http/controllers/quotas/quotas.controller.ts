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
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

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
  constructor(repository: QuotasRepository) {
    super(repository)
    this.getByUnitId = this.getByUnitId.bind(this)
    this.getPendingByUnit = this.getPendingByUnit.bind(this)
    this.getByStatus = this.getByStatus.bind(this)
    this.getOverdue = this.getOverdue.bind(this)
    this.getByPeriod = this.getByPeriod.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [authMiddleware, paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/unit/:unitId/pending',
        handler: this.getPendingByUnit,
        middlewares: [authMiddleware, paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/status/:status',
        handler: this.getByStatus,
        middlewares: [authMiddleware, paramsValidator(StatusParamSchema)],
      },
      {
        method: 'get',
        path: '/overdue/:date',
        handler: this.getOverdue,
        middlewares: [authMiddleware, paramsValidator(DateParamSchema)],
      },
      {
        method: 'get',
        path: '/period',
        handler: this.getByPeriod,
        middlewares: [authMiddleware, queryValidator(PeriodQuerySchema)],
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
        middlewares: [authMiddleware, bodyValidator(quotaCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(quotaUpdateSchema),
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

  private async getByUnitId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const repo = this.repository as QuotasRepository

    try {
      const quotas = await repo.getByUnitId(ctx.params.unitId)
      return ctx.ok({ data: quotas })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getPendingByUnit(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const repo = this.repository as QuotasRepository

    try {
      const quotas = await repo.getPendingByUnit(ctx.params.unitId)
      return ctx.ok({ data: quotas })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByStatus(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TStatusParam>(c)
    const repo = this.repository as QuotasRepository

    try {
      const quotas = await repo.getByStatus(ctx.params.status)
      return ctx.ok({ data: quotas })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getOverdue(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TDateParam>(c)
    const repo = this.repository as QuotasRepository

    try {
      const quotas = await repo.getOverdue(ctx.params.date)
      return ctx.ok({ data: quotas })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByPeriod(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TPeriodQuery>(c)
    const repo = this.repository as QuotasRepository

    try {
      const quotas = await repo.getByPeriod(ctx.query.year, ctx.query.month)
      return ctx.ok({ data: quotas })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
