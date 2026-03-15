import type { Context } from 'hono'
import {
  paymentApplicationUpdateSchema,
  type TPaymentApplication,
  type TPaymentApplicationCreate,
  type TPaymentApplicationUpdate,
  ESystemRole,
} from '@packages/domain'
import type {
  PaymentApplicationsRepository,
  PaymentsRepository,
  QuotasRepository,
  QuotaAdjustmentsRepository,
  InterestConfigurationsRepository,
  PaymentPendingAllocationsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { ApplyPaymentToQuotaService } from '@services/payment-applications/apply-payment-to-quota.service'
import { z } from 'zod'

const PaymentIdParamSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID format'),
})

type TPaymentIdParam = z.infer<typeof PaymentIdParamSchema>

const QuotaIdParamSchema = z.object({
  quotaId: z.string().uuid('Invalid quota ID format'),
})

type TQuotaIdParam = z.infer<typeof QuotaIdParamSchema>

const ApplyPaymentBodySchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID format'),
  quotaId: z.string().uuid('Invalid quota ID format'),
  appliedAmount: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
    message: 'appliedAmount must be a positive number string',
  }),
})

/**
 * Controller for managing payment application resources.
 *
 * Endpoints:
 * - GET    /                     List all payment applications
 * - GET    /payment/:paymentId   Get by payment
 * - GET    /quota/:quotaId       Get by quota
 * - GET    /:id                  Get by ID
 * - POST   /                     Apply payment to quota (with interest recalculation)
 * - PATCH  /:id                  Update payment application
 * - DELETE /:id                  Delete payment application (hard delete)
 */
export class PaymentApplicationsController extends BaseController<
  TPaymentApplication,
  TPaymentApplicationCreate,
  TPaymentApplicationUpdate
> {
  private readonly applyService: ApplyPaymentToQuotaService

  constructor(
    repository: PaymentApplicationsRepository,
    private readonly db: TDrizzleClient,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly quotasRepo: QuotasRepository,
    private readonly adjustmentsRepo: QuotaAdjustmentsRepository,
    private readonly interestConfigsRepo: InterestConfigurationsRepository,
    private readonly pendingAllocationsRepo?: PaymentPendingAllocationsRepository,
  ) {
    super(repository)
    this.applyService = new ApplyPaymentToQuotaService(
      db, repository, paymentsRepo, quotasRepo, adjustmentsRepo, interestConfigsRepo, pendingAllocationsRepo,
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)] },
      {
        method: 'get',
        path: '/payment/:paymentId',
        handler: this.getByPaymentId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(PaymentIdParamSchema)],
      },
      {
        method: 'get',
        path: '/quota/:quotaId',
        handler: this.getByQuotaId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(QuotaIdParamSchema)],
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
        handler: this.applyPayment,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), bodyValidator(ApplyPaymentBodySchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
          bodyValidator(paymentApplicationUpdateSchema),
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
    const entities = await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private applyPayment = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<{ paymentId: string; quotaId: string; appliedAmount: string }>(c)
    const user = c.get('user') as { id: string }

    const result = await this.applyService.execute({
      paymentId: ctx.body.paymentId,
      quotaId: ctx.body.quotaId,
      appliedAmount: ctx.body.appliedAmount,
      registeredByUserId: user.id,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') {
        return ctx.notFound({ error: result.error })
      }
      return ctx.badRequest({ error: result.error })
    }

    return ctx.created({ data: result.data })
  }

  private getByPaymentId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TPaymentIdParam>(c)
    const repo = this.repository as PaymentApplicationsRepository

    try {
      const applications = await repo.getByPaymentId(ctx.params.paymentId)
      return ctx.ok({ data: applications })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByQuotaId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TQuotaIdParam>(c)
    const repo = this.repository as PaymentApplicationsRepository

    try {
      const applications = await repo.getByQuotaId(ctx.params.quotaId)
      return ctx.ok({ data: applications })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
