import type { Context } from 'hono'
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  type TExpense,
  type TExpenseCreate,
  type TExpenseUpdate,
} from '@packages/domain'
import type { ExpensesRepository } from '@database/repositories'
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

const CondominiumIdParamSchema = z.object({
  condominiumId: z.string().uuid('Invalid condominium ID format'),
})

type TCondominiumIdParam = z.infer<typeof CondominiumIdParamSchema>

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
 * - GET    /                              List all expenses
 * - GET    /pending-approval              Get pending approval expenses
 * - GET    /condominium/:condominiumId    Get by condominium
 * - GET    /building/:buildingId          Get by building
 * - GET    /category/:categoryId          Get by category
 * - GET    /status/:status                Get by status
 * - GET    /date-range                    Get by date range (query params)
 * - GET    /:id                           Get by ID
 * - POST   /                              Create expense
 * - PATCH  /:id                           Update expense
 * - DELETE /:id                           Delete expense (hard delete)
 */
export class ExpensesController extends BaseController<TExpense, TExpenseCreate, TExpenseUpdate> {
  constructor(repository: ExpensesRepository) {
    super(repository)
    this.getPendingApproval = this.getPendingApproval.bind(this)
    this.getByCondominiumId = this.getByCondominiumId.bind(this)
    this.getByBuildingId = this.getByBuildingId.bind(this)
    this.getByCategoryId = this.getByCategoryId.bind(this)
    this.getByStatus = this.getByStatus.bind(this)
    this.getByDateRange = this.getByDateRange.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/pending-approval',
        handler: this.getPendingApproval,
        middlewares: [authMiddleware],
      },
      {
        method: 'get',
        path: '/condominium/:condominiumId',
        handler: this.getByCondominiumId,
        middlewares: [authMiddleware, paramsValidator(CondominiumIdParamSchema)],
      },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [authMiddleware, paramsValidator(BuildingIdParamSchema)],
      },
      {
        method: 'get',
        path: '/category/:categoryId',
        handler: this.getByCategoryId,
        middlewares: [authMiddleware, paramsValidator(CategoryIdParamSchema)],
      },
      {
        method: 'get',
        path: '/status/:status',
        handler: this.getByStatus,
        middlewares: [authMiddleware, paramsValidator(StatusParamSchema)],
      },
      {
        method: 'get',
        path: '/date-range',
        handler: this.getByDateRange,
        middlewares: [authMiddleware, queryValidator(DateRangeQuerySchema)],
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
        middlewares: [authMiddleware, bodyValidator(expenseCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(expenseUpdateSchema),
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

  private async getPendingApproval(c: Context): Promise<Response> {
    const ctx = this.ctx(c)
    const repo = this.repository as ExpensesRepository

    try {
      const expenses = await repo.getPendingApproval()
      return ctx.ok({ data: expenses })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByCondominiumId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCondominiumIdParam>(c)
    const repo = this.repository as ExpensesRepository

    try {
      const expenses = await repo.getByCondominiumId(ctx.params.condominiumId)
      return ctx.ok({ data: expenses })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByBuildingId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)
    const repo = this.repository as ExpensesRepository

    try {
      const expenses = await repo.getByBuildingId(ctx.params.buildingId)
      return ctx.ok({ data: expenses })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByCategoryId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCategoryIdParam>(c)
    const repo = this.repository as ExpensesRepository

    try {
      const expenses = await repo.getByCategoryId(ctx.params.categoryId)
      return ctx.ok({ data: expenses })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByStatus(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TStatusParam>(c)
    const repo = this.repository as ExpensesRepository

    try {
      const expenses = await repo.getByStatus(ctx.params.status)
      return ctx.ok({ data: expenses })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByDateRange(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TDateRangeQuery>(c)
    const repo = this.repository as ExpensesRepository

    try {
      const expenses = await repo.getByDateRange(ctx.query.startDate, ctx.query.endDate)
      return ctx.ok({ data: expenses })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
