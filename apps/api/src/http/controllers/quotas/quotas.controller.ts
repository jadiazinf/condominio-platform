import type { Context } from 'hono'
import {
  quotaCreateSchema,
  quotaUpdateSchema,
  type TQuota,
  type TQuotaCreate,
  type TQuotaUpdate,
  ESystemRole,
} from '@packages/domain'
import type { QuotasRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
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

const PaginatedByUnitQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
})

type TPaginatedByUnitQuery = z.infer<typeof PaginatedByUnitQuerySchema>

const PeriodQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
})

type TPeriodQuery = z.infer<typeof PeriodQuerySchema>

export class QuotasController extends BaseController<TQuota, TQuotaCreate, TQuotaUpdate> {
  private readonly quotasRepository: QuotasRepository

  constructor(repository: QuotasRepository) {
    super(repository)
    this.quotasRepository = repository
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)] },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/unit/:unitId/paginated',
        handler: this.getByUnitIdPaginated,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER),
          paramsValidator(UnitIdParamSchema),
          queryValidator(PaginatedByUnitQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/unit/:unitId/pending',
        handler: this.getPendingByUnit,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/status/:status',
        handler: this.getByStatus,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(StatusParamSchema)],
      },
      {
        method: 'get',
        path: '/overdue/:date',
        handler: this.getOverdue,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(DateParamSchema)],
      },
      {
        method: 'get',
        path: '/period',
        handler: this.getByPeriod,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), queryValidator(PeriodQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), bodyValidator(quotaCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
          bodyValidator(quotaUpdateSchema),
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

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const entities = await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  private getByUnitIdPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TPaginatedByUnitQuery, TUnitIdParam>(c)
    const result = await this.quotasRepository.listPaginatedByUnit(ctx.params.unitId, {
      page: ctx.query.page,
      limit: ctx.query.limit,
      startDate: ctx.query.startDate,
      endDate: ctx.query.endDate,
      status: ctx.query.status,
    })
    return ctx.ok(result)
  }

  private getByUnitId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const data = await this.quotasRepository.getByUnitId(ctx.params.unitId)
    return ctx.ok({ data })
  }

  private getPendingByUnit = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const data = await this.quotasRepository.getPendingByUnit(ctx.params.unitId)
    return ctx.ok({ data })
  }

  private getByStatus = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TStatusParam>(c)
    const data = await this.quotasRepository.getByStatus(ctx.params.status)
    return ctx.ok({ data })
  }

  private getOverdue = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TDateParam>(c)
    const data = await this.quotasRepository.getOverdue(ctx.params.date)
    return ctx.ok({ data })
  }

  private getByPeriod = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TPeriodQuery>(c)
    const data = await this.quotasRepository.getByPeriod(ctx.query.year, ctx.query.month)
    return ctx.ok({ data })
  }
}
