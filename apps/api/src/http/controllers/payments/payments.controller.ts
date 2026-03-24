import type { Context } from 'hono'
import {
  paymentCreateSchema,
  paymentUpdateSchema,
  type TPayment,
  type TPaymentCreate,
  type TPaymentUpdate,
  ESystemRole,
} from '@packages/domain'
import type {
  PaymentsRepository,
  PaymentApplicationsRepository,
  QuotasRepository,
  PaymentGatewaysRepository,
  EntityPaymentGatewaysRepository,
  BankAccountsRepository,
  QuotaAdjustmentsRepository,
  PaymentPendingAllocationsRepository,
  UnitsRepository,
  BuildingsRepository,
} from '@database/repositories'
import type { GatewayTransactionsRepository } from '@database/repositories/gateway-transactions.repository'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import type { SendNotificationService } from '@src/services/notifications'
import type { PaymentGatewayManager } from '@src/services/payment-gateways/gateway-manager'
import { AppError } from '@errors/index'
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
import type { EventLogger } from '@packages/services'
import {
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

const PaginatedByUnitQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  status: z
    .enum(['pending', 'pending_verification', 'completed', 'failed', 'refunded', 'rejected'])
    .optional(),
})

type TPaginatedByUnitQuery = z.infer<typeof PaginatedByUnitQuerySchema>

const PaginatedByUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  status: z
    .enum(['pending', 'pending_verification', 'completed', 'failed', 'refunded', 'rejected'])
    .optional(),
})

type TPaginatedByUserQuery = z.infer<typeof PaginatedByUserQuerySchema>

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

const VerifyReferenceBodySchema = z.object({
  externalReference: z.string().min(1, 'External reference is required'),
  bankAccountId: z.string().uuid('Invalid bank account ID'),
  senderBankCode: z.string().optional(),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
})

type TVerifyReferenceBody = z.infer<typeof VerifyReferenceBodySchema>

const ReportPaymentBodySchema = paymentCreateSchema.extend({
  externalReference: z.string().optional(),
  condominiumId: z.string().uuid().optional(),
})

type TReportPaymentBody = z.infer<typeof ReportPaymentBodySchema>

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
  private readonly paymentsRepository: PaymentsRepository
  private readonly paymentApplicationsRepository: PaymentApplicationsRepository
  private readonly reportPaymentService: ReportPaymentService
  private readonly verifyPaymentService: VerifyPaymentService
  private readonly rejectPaymentService: RejectPaymentService
  private readonly refundPaymentService: RefundPaymentService
  private readonly sendNotificationService: SendNotificationService
  private readonly bankAccountsRepository?: BankAccountsRepository
  private readonly paymentGatewaysRepository?: PaymentGatewaysRepository
  private readonly gatewayManagerInstance?: PaymentGatewayManager

  constructor(
    repository: PaymentsRepository,
    db: TDrizzleClient,
    paymentApplicationsRepo: PaymentApplicationsRepository,
    quotasRepo: QuotasRepository,
    sendNotificationService: SendNotificationService,
    private readonly unitsRepo: UnitsRepository,
    private readonly buildingsRepo: BuildingsRepository,
    paymentGatewaysRepo?: PaymentGatewaysRepository,
    entityPaymentGatewaysRepo?: EntityPaymentGatewaysRepository,
    gatewayTransactionsRepo?: GatewayTransactionsRepository,
    gatewayManager?: PaymentGatewayManager,
    bankAccountsRepo?: BankAccountsRepository,
    quotaAdjustmentsRepo?: QuotaAdjustmentsRepository,
    paymentPendingAllocationsRepo?: PaymentPendingAllocationsRepository,
    private readonly eventLogger?: EventLogger
  ) {
    super(repository)

    this.paymentsRepository = repository
    this.paymentApplicationsRepository = paymentApplicationsRepo
    this.sendNotificationService = sendNotificationService
    this.bankAccountsRepository = bankAccountsRepo
    this.paymentGatewaysRepository = paymentGatewaysRepo
    this.gatewayManagerInstance = gatewayManager

    // Initialize non-trivial services
    this.reportPaymentService = new ReportPaymentService(
      repository,
      paymentGatewaysRepo,
      entityPaymentGatewaysRepo,
      gatewayTransactionsRepo,
      gatewayManager
    )
    this.verifyPaymentService = new VerifyPaymentService(repository, eventLogger)
    this.rejectPaymentService = new RejectPaymentService(repository, eventLogger)
    this.refundPaymentService = new RefundPaymentService(
      db,
      repository,
      paymentApplicationsRepo,
      quotasRepo,
      quotaAdjustmentsRepo,
      paymentPendingAllocationsRepo,
      eventLogger
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.list,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)],
      },
      {
        method: 'get',
        path: '/pending-verification',
        handler: this.getPendingVerification,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)],
      },
      {
        method: 'get',
        path: '/number/:paymentNumber',
        handler: this.getByPaymentNumber,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(PaymentNumberParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
          paramsValidator(UserIdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/user/:userId/paginated',
        handler: this.getByUserIdPaginated,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
          paramsValidator(UserIdParamSchema),
          queryValidator(PaginatedByUserQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(UnitIdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/unit/:unitId/paginated',
        handler: this.getByUnitIdPaginated,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(UnitIdParamSchema),
          queryValidator(PaginatedByUnitQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/status/:status',
        handler: this.getByStatus,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(StatusParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/date-range',
        handler: this.getByDateRange,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          queryValidator(DateRangeQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          bodyValidator(paymentCreateSchema),
        ],
      },
      {
        method: 'post',
        path: '/report',
        handler: this.reportPayment,
        middlewares: [authMiddleware, bodyValidator(ReportPaymentBodySchema)],
      },
      {
        method: 'post',
        path: '/verify-reference',
        handler: this.verifyReference,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          bodyValidator(VerifyReferenceBodySchema),
        ],
      },
      {
        method: 'post',
        path: '/:id/verify',
        handler: this.verifyPayment,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
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
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
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
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
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
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
          bodyValidator(paymentUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          paramsValidator(IdParamSchema),
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Overridden Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const entity = await this.paymentsRepository.getByIdWithRelations(ctx.params.id)
    if (!entity) throw AppError.notFound('Resource', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId) {
      const unit = await this.unitsRepo.getById(entity.unitId)
      if (!unit) throw AppError.notFound('Resource', ctx.params.id)
      const building = await this.buildingsRepo.getById(unit.buildingId)
      if (!building || building.condominiumId !== condominiumId) {
        throw AppError.notFound('Resource', ctx.params.id)
      }
    }

    // Enrich with payment applications (concept name, period, balance)
    const applications = await this.paymentApplicationsRepository.getByPaymentIdWithRelations(
      ctx.params.id,
      condominiumId
    )

    // Enrich with destination bank account info
    const details = entity.paymentDetails as Record<string, unknown> | null
    let bankAccount:
      | { displayName: string; bankName: string; accountHolderName: string }
      | undefined
    if (details?.bankAccountId && this.bankAccountsRepository) {
      const ba = await this.bankAccountsRepository.getById(details.bankAccountId as string)
      if (ba) {
        bankAccount = {
          displayName: ba.displayName,
          bankName: ba.bankName,
          accountHolderName: ba.accountHolderName,
        }
      }
    }

    return ctx.ok({
      data: {
        ...entity,
        applications,
        bankAccount,
      },
    })
  }

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const entities = condominiumId
      ? await this.paymentsRepository.listByCondominiumId(condominiumId)
      : await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByPaymentNumber = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TPaymentNumberParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const payment = await this.paymentsRepository.getByPaymentNumber(
      ctx.params.paymentNumber,
      condominiumId
    )

    if (!payment) {
      return ctx.notFound({ error: 'Payment not found' })
    }

    return ctx.ok({ data: payment })
  }

  private getByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const payments = await this.paymentsRepository.getByUserId(ctx.params.userId, condominiumId)
    return ctx.ok({ data: payments })
  }

  private getByUserIdPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TPaginatedByUserQuery, TUserIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const result = await this.paymentsRepository.listPaginatedByUserWithRelations(
      ctx.params.userId,
      {
        page: ctx.query.page,
        limit: ctx.query.limit,
        startDate: ctx.query.startDate,
        endDate: ctx.query.endDate,
        status: ctx.query.status,
      },
      condominiumId
    )

    // Enrich old payments that don't have concept info in paymentDetails.quotas
    const paymentsNeedingEnrichment = result.data.filter(p => {
      const details = p.paymentDetails as { quotas?: { conceptName?: string }[] } | null
      if (!details?.quotas?.length) return true
      return details.quotas.some(q => !q.conceptName)
    })

    if (paymentsNeedingEnrichment.length > 0) {
      const paymentIds = paymentsNeedingEnrichment.map(p => p.id)
      const applications = await this.paymentApplicationsRepository.getByPaymentIdsWithRelations(
        paymentIds,
        condominiumId
      )

      // Group applications by paymentId
      const appsByPayment = new Map<string, typeof applications>()
      for (const app of applications) {
        const existing = appsByPayment.get(app.paymentId) ?? []
        existing.push(app)
        appsByPayment.set(app.paymentId, existing)
      }

      // Enrich payments with concept/period data from applications
      for (const payment of paymentsNeedingEnrichment) {
        const apps = appsByPayment.get(payment.id)
        if (!apps?.length) continue

        const enrichedQuotas = apps.map(app => ({
          quotaId: app.quotaId,
          amount: app.appliedAmount,
          conceptName: app.conceptName,
          periodYear: app.periodYear,
          periodMonth: app.periodMonth,
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(payment as any).paymentDetails = {
          ...(payment.paymentDetails as Record<string, unknown> | null),
          quotas: enrichedQuotas,
        }
      }
    }

    return ctx.ok(result)
  }

  private getByUnitIdPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TPaginatedByUnitQuery, TUnitIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const result = await this.paymentsRepository.listPaginatedByUnit(
      ctx.params.unitId,
      {
        page: ctx.query.page,
        limit: ctx.query.limit,
        startDate: ctx.query.startDate,
        endDate: ctx.query.endDate,
        status: ctx.query.status,
      },
      condominiumId
    )

    return ctx.ok(result)
  }

  private getByUnitId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const payments = await this.paymentsRepository.getByUnitId(ctx.params.unitId, condominiumId)
    return ctx.ok({ data: payments })
  }

  private getByStatus = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TStatusParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const payments = await this.paymentsRepository.getByStatus(ctx.params.status, condominiumId)
    return ctx.ok({ data: payments })
  }

  private getByDateRange = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TDateRangeQuery>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const payments = await this.paymentsRepository.getByDateRange(
      ctx.query.startDate,
      ctx.query.endDate,
      condominiumId
    )
    return ctx.ok({ data: payments })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Payment Verification Flow
  // ─────────────────────────────────────────────────────────────────────────────

  private getPendingVerification = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const payments = await this.paymentsRepository.getPendingVerification(condominiumId)
    return ctx.ok({ data: payments })
  }

  private reportPayment = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TReportPaymentBody>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const { externalReference, condominiumId, ...paymentData } = ctx.body

      const result = await this.reportPaymentService.execute({
        paymentData,
        registeredByUserId: user.id,
        externalReference,
        condominiumId,
      })

      if (!result.success) {
        return this.handleServiceError(ctx, result)
      }

      return ctx.created({
        data: result.data.payment,
        autoVerified: result.data.autoVerified,
      })
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
      this.sendNotificationService
        .execute({
          userId: result.data.payment.userId,
          category: 'payment',
          title: 'Payment Verified',
          body: `Your payment has been verified and approved.`,
          channels: ['in_app', 'push'],
          data: { paymentId: result.data.payment.id, action: 'payment_verified' },
        })
        .catch(() => {})

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
      this.sendNotificationService
        .execute({
          userId: result.data.payment.userId,
          category: 'payment',
          title: 'Payment Rejected',
          body: `Your payment has been rejected.${ctx.body.notes ? ` Reason: ${ctx.body.notes}` : ''}`,
          channels: ['in_app', 'push'],
          priority: 'high',
          data: { paymentId: result.data.payment.id, action: 'payment_rejected' },
        })
        .catch(() => {})

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
      this.sendNotificationService
        .execute({
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
        })
        .catch(() => {})

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
  // Standalone Reference Verification
  // ─────────────────────────────────────────────────────────────────────────────

  private verifyReference = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TVerifyReferenceBody>(c)

    try {
      if (
        !this.bankAccountsRepository ||
        !this.paymentGatewaysRepository ||
        !this.gatewayManagerInstance
      ) {
        return ctx.badRequest({ error: 'Gateway verification is not configured' })
      }

      const { externalReference, bankAccountId, senderBankCode, transactionDate } = ctx.body

      // Look up the bank account to find its associated gateway
      const bankAccount = await this.bankAccountsRepository.getById(bankAccountId)
      if (!bankAccount) {
        return ctx.notFound({ error: 'Bank account not found' })
      }

      // Find the payment gateway associated with this bank account
      const gateways = await this.paymentGatewaysRepository.listAll()
      const gateway = gateways.find(
        g => g.isActive && this.gatewayManagerInstance!.hasAdapter(g.gatewayType)
      )

      if (!gateway) {
        return ctx.badRequest({ error: 'No active payment gateway configured' })
      }

      const adapter = this.gatewayManagerInstance.getAdapter(gateway.gatewayType)
      const config = (gateway.configuration as Record<string, unknown>) ?? {}

      const configValidation = adapter.validateConfiguration(config)
      if (!configValidation.valid) {
        return ctx.badRequest({
          error: 'Gateway configuration incomplete',
          missingFields: configValidation.missingFields,
        })
      }

      const verification = await adapter.verifyPayment({
        paymentId: '', // No payment yet — standalone check
        externalReference,
        gatewayConfiguration: config,
        senderBankCode,
        transactionDate,
      })

      return ctx.ok({
        data: {
          found: verification.found,
          status: verification.status,
          verifiedAmount: verification.verifiedAmount ?? null,
          verifiedAt: verification.verifiedAt ?? null,
          externalTransactionId: verification.externalTransactionId ?? null,
        },
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
