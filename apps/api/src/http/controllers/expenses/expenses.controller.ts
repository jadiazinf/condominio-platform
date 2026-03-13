import type { Context } from 'hono'
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  type TExpense,
  type TExpenseCreate,
  type TExpenseUpdate,
  ESystemRole,
} from '@packages/domain'
import type { ExpensesRepository } from '@database/repositories'
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

const BuildingIdParamSchema = z.object({
  buildingId: z.string().uuid('Invalid building ID format'),
})

type TBuildingIdParam = z.infer<typeof BuildingIdParamSchema>

const CategoryIdParamSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID format'),
})

type TCategoryIdParam = z.infer<typeof CategoryIdParamSchema>

const StatusParamSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'paid']),
})

type TStatusParam = z.infer<typeof StatusParamSchema>

const DateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

type TDateRangeQuery = z.infer<typeof DateRangeQuerySchema>

/**
 * Controller for managing expense resources.
 *
 * Endpoints:
 * - GET    /                              List expenses (scoped by condominium from context)
 * - GET    /pending-approval              Get pending approval expenses
 * - GET    /building/:buildingId          Get by building
 * - GET    /category/:categoryId          Get by category
 * - GET    /status/:status                Get by status
 * - GET    /date-range                    Get by date range (query params)
 * - GET    /:id                           Get by ID
 * - POST   /                              Create expense (condominiumId injected from context)
 * - PATCH  /:id                           Update expense
 * - DELETE /:id                           Delete expense (hard delete)
 */
export class ExpensesController extends BaseController<TExpense, TExpenseCreate, TExpenseUpdate> {
  private readonly expensesRepository: ExpensesRepository

  constructor(repository: ExpensesRepository) {
    super(repository)
    this.expensesRepository = repository
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)] },
      {
        method: 'get',
        path: '/pending-approval',
        handler: this.getPendingApproval,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)],
      },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(BuildingIdParamSchema)],
      },
      {
        method: 'get',
        path: '/category/:categoryId',
        handler: this.getByCategoryId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(CategoryIdParamSchema)],
      },
      {
        method: 'get',
        path: '/status/:status',
        handler: this.getByStatus,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(StatusParamSchema)],
      },
      {
        method: 'get',
        path: '/date-range',
        handler: this.getByDateRange,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), queryValidator(DateRangeQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), bodyValidator(expenseCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
          bodyValidator(expenseUpdateSchema),
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
    const data = await this.expensesRepository.getByCondominiumId(condominiumId)
    return ctx.ok({ data })
  }

  protected override create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TExpenseCreate>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const entity = await this.repository.create({ ...ctx.body, condominiumId })
    return ctx.created({ data: entity })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getPendingApproval = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const data = await this.expensesRepository.getPendingApproval()
    return ctx.ok({ data })
  }

  private getByBuildingId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)
    const data = await this.expensesRepository.getByBuildingId(ctx.params.buildingId)
    return ctx.ok({ data })
  }

  private getByCategoryId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TCategoryIdParam>(c)
    const data = await this.expensesRepository.getByCategoryId(ctx.params.categoryId)
    return ctx.ok({ data })
  }

  private getByStatus = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TStatusParam>(c)
    const data = await this.expensesRepository.getByStatus(ctx.params.status)
    return ctx.ok({ data })
  }

  private getByDateRange = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TDateRangeQuery>(c)
    const data = await this.expensesRepository.getByDateRange(ctx.query.startDate, ctx.query.endDate)
    return ctx.ok({ data })
  }
}
