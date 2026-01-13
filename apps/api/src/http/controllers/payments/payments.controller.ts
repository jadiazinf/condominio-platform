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
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import {
  GetPaymentByNumberService,
  GetPaymentsByUserService,
  GetPaymentsByUnitService,
  GetPaymentsByStatusService,
  GetPaymentsByDateRangeService,
  GetPendingVerificationPaymentsService,
  ReportPaymentService,
  VerifyPaymentService,
  RejectPaymentService,
} from '@src/services/payments'

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
  status: z.enum([
    'pending',
    'pending_verification',
    'completed',
    'failed',
    'refunded',
    'rejected',
  ]),
})

type TStatusParam = z.infer<typeof StatusParamSchema>

const DateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

type TDateRangeQuery = z.infer<typeof DateRangeQuerySchema>

const VerificationBodySchema = z.object({
  notes: z.string().optional(),
})

type TVerificationBody = z.infer<typeof VerificationBodySchema>

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for managing payment resources.
 *
 * Endpoints:
 * - GET    /                           List all payments
 * - GET    /pending-verification       List payments pending admin verification
 * - GET    /number/:paymentNumber      Get by payment number
 * - GET    /user/:userId               Get by user
 * - GET    /unit/:unitId               Get by unit
 * - GET    /status/:status             Get by status
 * - GET    /date-range                 Get by date range (query params)
 * - GET    /:id                        Get by ID
 * - POST   /                           Create payment
 * - POST   /report                     Report external payment (tenant reports payment, status: pending_verification)
 * - POST   /:id/verify                 Verify/approve a payment (admin action)
 * - POST   /:id/reject                 Reject a payment (admin action)
 * - PATCH  /:id                        Update payment
 * - DELETE /:id                        Delete payment (hard delete)
 */
export class PaymentsController extends BaseController<TPayment, TPaymentCreate, TPaymentUpdate> {
  private readonly getPaymentByNumberService: GetPaymentByNumberService
  private readonly getPaymentsByUserService: GetPaymentsByUserService
  private readonly getPaymentsByUnitService: GetPaymentsByUnitService
  private readonly getPaymentsByStatusService: GetPaymentsByStatusService
  private readonly getPaymentsByDateRangeService: GetPaymentsByDateRangeService
  private readonly getPendingVerificationPaymentsService: GetPendingVerificationPaymentsService
  private readonly reportPaymentService: ReportPaymentService
  private readonly verifyPaymentService: VerifyPaymentService
  private readonly rejectPaymentService: RejectPaymentService

  constructor(repository: PaymentsRepository) {
    super(repository)

    // Initialize services
    this.getPaymentByNumberService = new GetPaymentByNumberService(repository)
    this.getPaymentsByUserService = new GetPaymentsByUserService(repository)
    this.getPaymentsByUnitService = new GetPaymentsByUnitService(repository)
    this.getPaymentsByStatusService = new GetPaymentsByStatusService(repository)
    this.getPaymentsByDateRangeService = new GetPaymentsByDateRangeService(repository)
    this.getPendingVerificationPaymentsService = new GetPendingVerificationPaymentsService(
      repository
    )
    this.reportPaymentService = new ReportPaymentService(repository)
    this.verifyPaymentService = new VerifyPaymentService(repository)
    this.rejectPaymentService = new RejectPaymentService(repository)

    // Bind handlers
    this.getByPaymentNumber = this.getByPaymentNumber.bind(this)
    this.getByUserId = this.getByUserId.bind(this)
    this.getByUnitId = this.getByUnitId.bind(this)
    this.getByStatus = this.getByStatus.bind(this)
    this.getByDateRange = this.getByDateRange.bind(this)
    this.getPendingVerification = this.getPendingVerification.bind(this)
    this.reportPayment = this.reportPayment.bind(this)
    this.verifyPayment = this.verifyPayment.bind(this)
    this.rejectPayment = this.rejectPayment.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/pending-verification',
        handler: this.getPendingVerification,
        middlewares: [authMiddleware],
      },
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
        method: 'post',
        path: '/report',
        handler: this.reportPayment,
        middlewares: [authMiddleware, bodyValidator(paymentCreateSchema)],
      },
      {
        method: 'post',
        path: '/:id/verify',
        handler: this.verifyPayment,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(VerificationBodySchema),
        ],
      },
      {
        method: 'post',
        path: '/:id/reject',
        handler: this.rejectPayment,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(VerificationBodySchema),
        ],
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

    try {
      const result = await this.getPaymentByNumberService.execute({
        paymentNumber: ctx.params.paymentNumber,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.getPaymentsByUserService.execute({
        userId: ctx.params.userId,
      })

      if (!result.success) {
        return this.handleServiceError(ctx, result)
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUnitId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)

    try {
      const result = await this.getPaymentsByUnitService.execute({
        unitId: ctx.params.unitId,
      })

      if (!result.success) {
        return this.handleServiceError(ctx, result)
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByStatus(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TStatusParam>(c)

    try {
      const result = await this.getPaymentsByStatusService.execute({
        status: ctx.params.status,
      })

      if (!result.success) {
        return this.handleServiceError(ctx, result)
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByDateRange(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TDateRangeQuery>(c)

    try {
      const result = await this.getPaymentsByDateRangeService.execute({
        startDate: ctx.query.startDate,
        endDate: ctx.query.endDate,
      })

      if (!result.success) {
        return this.handleServiceError(ctx, result)
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Payment Verification Flow
  // ─────────────────────────────────────────────────────────────────────────────

  private async getPendingVerification(c: Context): Promise<Response> {
    const ctx = this.ctx(c)

    try {
      const result = await this.getPendingVerificationPaymentsService.execute()

      if (!result.success) {
        return this.handleServiceError(ctx, result)
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async reportPayment(c: Context): Promise<Response> {
    const ctx = this.ctx<TPaymentCreate>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.reportPaymentService.execute({
        paymentData: ctx.body,
        registeredByUserId: user.id,
      })

      if (!result.success) {
        return this.handleServiceError(ctx, result)
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async verifyPayment(c: Context): Promise<Response> {
    const ctx = this.ctx<TVerificationBody, unknown, TIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.verifyPaymentService.execute({
        paymentId: ctx.params.id,
        verifiedByUserId: user.id,
        notes: ctx.body.notes,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: 'Payment not found' })
        }
        if (result.code === 'BAD_REQUEST') {
          // Extract current status from error message for backward compatibility
          const statusMatch = result.error.match(/Current status: (.+)$/)
          return ctx.badRequest({
            error: 'Payment is not pending verification',
            currentStatus: statusMatch ? statusMatch[1] : undefined,
          })
        }
        return this.handleServiceError(ctx, result)
      }

      return ctx.ok({ data: result.data.payment, message: result.data.message })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async rejectPayment(c: Context): Promise<Response> {
    const ctx = this.ctx<TVerificationBody, unknown, TIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.rejectPaymentService.execute({
        paymentId: ctx.params.id,
        rejectedByUserId: user.id,
        notes: ctx.body.notes,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: 'Payment not found' })
        }
        if (result.code === 'BAD_REQUEST') {
          // Extract current status from error message for backward compatibility
          const statusMatch = result.error.match(/Current status: (.+)$/)
          return ctx.badRequest({
            error: 'Payment is not pending verification',
            currentStatus: statusMatch ? statusMatch[1] : undefined,
          })
        }
        return this.handleServiceError(ctx, result)
      }

      return ctx.ok({ data: result.data.payment, message: result.data.message })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────────

  private handleServiceError(
    ctx: ReturnType<typeof this.ctx>,
    result: { success: false; error: string; code: string }
  ): Response | Promise<Response> {
    switch (result.code) {
      case 'NOT_FOUND':
        return ctx.notFound({ error: result.error })
      case 'BAD_REQUEST':
        return ctx.badRequest({ error: result.error })
      case 'CONFLICT':
        return ctx.conflict({ error: result.error })
      default:
        return ctx.internalError({ error: result.error })
    }
  }
}
