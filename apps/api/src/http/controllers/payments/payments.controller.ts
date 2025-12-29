import type { Context } from 'hono'
import {
  paymentCreateSchema,
  paymentUpdateSchema,
  type TPayment,
  type TPaymentCreate,
  type TPaymentUpdate,
} from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
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

const PaymentNumberParamSchema = z.object({
  paymentNumber: z.string().min(1),
})

type TPaymentNumberParam = z.infer<typeof PaymentNumberParamSchema>

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

const UnitIdParamSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID format'),
})

type TUnitIdParam = z.infer<typeof UnitIdParamSchema>

const StatusParamSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']),
})

type TStatusParam = z.infer<typeof StatusParamSchema>

const DateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

type TDateRangeQuery = z.infer<typeof DateRangeQuerySchema>

/**
 * Controller for managing payment resources.
 *
 * Endpoints:
 * - GET    /                           List all payments
 * - GET    /number/:paymentNumber      Get by payment number
 * - GET    /user/:userId               Get by user
 * - GET    /unit/:unitId               Get by unit
 * - GET    /status/:status             Get by status
 * - GET    /date-range                 Get by date range (query params)
 * - GET    /:id                        Get by ID
 * - POST   /                           Create payment
 * - PATCH  /:id                        Update payment
 * - DELETE /:id                        Delete payment (hard delete)
 */
export class PaymentsController extends BaseController<TPayment, TPaymentCreate, TPaymentUpdate> {
  constructor(repository: PaymentsRepository) {
    super(repository)
    this.getByPaymentNumber = this.getByPaymentNumber.bind(this)
    this.getByUserId = this.getByUserId.bind(this)
    this.getByUnitId = this.getByUnitId.bind(this)
    this.getByStatus = this.getByStatus.bind(this)
    this.getByDateRange = this.getByDateRange.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/number/:paymentNumber',
        handler: this.getByPaymentNumber,
        middlewares: [authMiddleware, paramsValidator(PaymentNumberParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
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
        middlewares: [authMiddleware, bodyValidator(paymentCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(paymentUpdateSchema),
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

  private async getByPaymentNumber(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TPaymentNumberParam>(c)
    const repo = this.repository as PaymentsRepository

    try {
      const payment = await repo.getByPaymentNumber(ctx.params.paymentNumber)

      if (!payment) {
        return ctx.notFound({ error: 'Payment not found' })
      }

      return ctx.ok({ data: payment })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as PaymentsRepository

    try {
      const payments = await repo.getByUserId(ctx.params.userId)
      return ctx.ok({ data: payments })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUnitId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const repo = this.repository as PaymentsRepository

    try {
      const payments = await repo.getByUnitId(ctx.params.unitId)
      return ctx.ok({ data: payments })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByStatus(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TStatusParam>(c)
    const repo = this.repository as PaymentsRepository

    try {
      const payments = await repo.getByStatus(ctx.params.status)
      return ctx.ok({ data: payments })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByDateRange(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TDateRangeQuery>(c)
    const repo = this.repository as PaymentsRepository

    try {
      const payments = await repo.getByDateRange(ctx.query.startDate, ctx.query.endDate)
      return ctx.ok({ data: payments })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
