import type { Context } from 'hono'
import {
  paymentApplicationCreateSchema,
  paymentApplicationUpdateSchema,
  type TPaymentApplication,
  type TPaymentApplicationCreate,
  type TPaymentApplicationUpdate,
} from '@packages/domain'
import type { PaymentApplicationsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const PaymentIdParamSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID format'),
})

type TPaymentIdParam = z.infer<typeof PaymentIdParamSchema>

const QuotaIdParamSchema = z.object({
  quotaId: z.string().uuid('Invalid quota ID format'),
})

type TQuotaIdParam = z.infer<typeof QuotaIdParamSchema>

/**
 * Controller for managing payment application resources.
 *
 * Endpoints:
 * - GET    /                     List all payment applications
 * - GET    /payment/:paymentId   Get by payment
 * - GET    /quota/:quotaId       Get by quota
 * - GET    /:id                  Get by ID
 * - POST   /                     Create payment application
 * - PATCH  /:id                  Update payment application
 * - DELETE /:id                  Delete payment application (hard delete)
 */
export class PaymentApplicationsController extends BaseController<
  TPaymentApplication,
  TPaymentApplicationCreate,
  TPaymentApplicationUpdate
> {
  constructor(repository: PaymentApplicationsRepository) {
    super(repository)
    this.getByPaymentId = this.getByPaymentId.bind(this)
    this.getByQuotaId = this.getByQuotaId.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      {
        method: 'get',
        path: '/payment/:paymentId',
        handler: this.getByPaymentId,
        middlewares: [paramsValidator(PaymentIdParamSchema)],
      },
      {
        method: 'get',
        path: '/quota/:quotaId',
        handler: this.getByQuotaId,
        middlewares: [paramsValidator(QuotaIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [bodyValidator(paymentApplicationCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          paramsValidator(IdParamSchema),
          bodyValidator(paymentApplicationUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getByPaymentId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TPaymentIdParam>(c)
    const repo = this.repository as PaymentApplicationsRepository

    try {
      const applications = await repo.getByPaymentId(ctx.params.paymentId)
      return ctx.ok({ data: applications })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByQuotaId(c: Context): Promise<Response> {
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
