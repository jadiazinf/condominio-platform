import type { Context } from 'hono'
import {
  paymentCreateSchema,
  paymentUpdateSchema,
  type TPayment,
  type TPaymentCreate,
  type TPaymentUpdate,
} from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
  PaymentApplicationsRepository,
  QuotasRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { SendNotificationService } from '@src/services/notifications'
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
  RefundPaymentService,
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

const RefundBodySchema = z.object({
  refundReason: z.string().min(1, 'Refund reason is required'),
})

type TRefundBody = z.infer<typeof RefundBodySchema>

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
 * - POST   /:id/refund                 Refund a completed payment (admin action)
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
  private readonly refundPaymentService: RefundPaymentService
  private readonly sendNotificationService: SendNotificationService

  constructor(repository: PaymentsRepository, db: TDrizzleClient) {
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

    // Initialize refund service with transaction support
    const paymentApplicationsRepo = new PaymentApplicationsRepository(db)
    const quotasRepo = new QuotasRepository(db)
    this.refundPaymentService = new RefundPaymentService(db, repository, paymentApplicationsRepo, quotasRepo)

    // Initialize notification service
    const notificationsRepo = new NotificationsRepository(db)
    const deliveriesRepo = new NotificationDeliveriesRepository(db)
    const preferencesRepo = new UserNotificationPreferencesRepository(db)
    const fcmTokensRepo = new UserFcmTokensRepository(db)
    this.sendNotificationService = new SendNotificationService(
      notificationsRepo, deliveriesRepo, preferencesRepo, fcmTokensRepo
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT')] },
      {
        method: 'get',
        path: '/pending-verification',
        handler: this.getPendingVerification,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT')],
      },
      {
        method: 'get',
        path: '/number/:paymentNumber',
        handler: this.getByPaymentNumber,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(PaymentNumberParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/status/:status',
        handler: this.getByStatus,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(StatusParamSchema)],
      },
      {
        method: 'get',
        path: '/date-range',
        handler: this.getByDateRange,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), queryValidator(DateRangeQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'USER'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), bodyValidator(paymentCreateSchema)],
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
          requireRole('ADMIN', 'ACCOUNTANT'),
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
          requireRole('ADMIN', 'ACCOUNTANT'),
          paramsValidator(IdParamSchema),
          bodyValidator(VerificationBodySchema),
        ],
      },
      {
        method: 'post',
        path: '/:id/refund',
        handler: this.refundPayment,
        middlewares: [
          authMiddleware,
          requireRole('ADMIN', 'ACCOUNTANT'),
          paramsValidator(IdParamSchema),
          bodyValidator(RefundBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole('ADMIN', 'ACCOUNTANT'),
          paramsValidator(IdParamSchema),
          bodyValidator(paymentUpdateSchema),
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

  private getByPaymentNumber = async (c: Context): Promise<Response> => {
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

  private getByUserId = async (c: Context): Promise<Response> => {
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

  private getByUnitId = async (c: Context): Promise<Response> => {
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

  private getByStatus = async (c: Context): Promise<Response> => {
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

  private getByDateRange = async (c: Context): Promise<Response> => {
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

  private getPendingVerification = async (c: Context): Promise<Response> => {
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

  private reportPayment = async (c: Context): Promise<Response> => {
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

  private verifyPayment = async (c: Context): Promise<Response> => {
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

      // Fire-and-forget: notify payer
      this.sendNotificationService.execute({
        userId: result.data.payment.userId,
        category: 'payment',
        title: 'Payment Verified',
        body: `Your payment has been verified and approved.`,
        channels: ['in_app', 'push'],
        data: { paymentId: result.data.payment.id, action: 'payment_verified' },
      }).catch(() => {})

      return ctx.ok({ data: result.data.payment, message: result.data.message })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private rejectPayment = async (c: Context): Promise<Response> => {
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

      // Fire-and-forget: notify payer
      this.sendNotificationService.execute({
        userId: result.data.payment.userId,
        category: 'payment',
        title: 'Payment Rejected',
        body: `Your payment has been rejected.${ctx.body.notes ? ` Reason: ${ctx.body.notes}` : ''}`,
        channels: ['in_app', 'push'],
        priority: 'high',
        data: { paymentId: result.data.payment.id, action: 'payment_rejected' },
      }).catch(() => {})

      return ctx.ok({ data: result.data.payment, message: result.data.message })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private refundPayment = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TRefundBody, unknown, TIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.refundPaymentService.execute({
        paymentId: ctx.params.id,
        refundReason: ctx.body.refundReason,
        refundedByUserId: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: 'Payment not found' })
        }
        if (result.code === 'BAD_REQUEST') {
          // Extract current status from error message for backward compatibility
          const statusMatch = result.error.match(/Current status: (.+)$/)
          return ctx.badRequest({
            error: result.error,
            currentStatus: statusMatch ? statusMatch[1] : undefined,
          })
        }
        return this.handleServiceError(ctx, result)
      }

      // Fire-and-forget: notify payer about refund
      this.sendNotificationService.execute({
        userId: result.data.payment.userId,
        category: 'payment',
        title: 'Payment Refunded',
        body: `Your payment has been refunded. ${result.data.reversedApplications} quota(s) have been restored.`,
        channels: ['in_app', 'push'],
        priority: 'high',
        data: {
          paymentId: result.data.payment.id,
          action: 'payment_refunded',
          reversedApplications: result.data.reversedApplications,
        },
      }).catch(() => {})

      return ctx.ok({
        data: result.data.payment,
        message: result.data.message,
        reversedApplications: result.data.reversedApplications,
      })
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
