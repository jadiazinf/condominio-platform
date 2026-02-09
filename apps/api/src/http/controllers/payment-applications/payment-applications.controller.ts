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
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
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
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT')] },
      {
        method: 'get',
        path: '/payment/:paymentId',
        handler: this.getByPaymentId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(PaymentIdParamSchema)],
      },
      {
        method: 'get',
        path: '/quota/:quotaId',
        handler: this.getByQuotaId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(QuotaIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), bodyValidator(paymentApplicationCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole('ADMIN', 'ACCOUNTANT'),
          paramsValidator(IdParamSchema),
          bodyValidator(paymentApplicationUpdateSchema),
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
    // TODO: Filter by condominiumId via JOIN through payment → unit → building.condominiumId
    const entities = await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

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
