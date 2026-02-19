import type { Context } from 'hono'
import {
  interestConfigurationCreateSchema,
  interestConfigurationUpdateSchema,
  type TInterestConfiguration,
  type TInterestConfigurationCreate,
  type TInterestConfigurationUpdate,
  ESystemRole,
} from '@packages/domain'
import type { InterestConfigurationsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const PaymentConceptIdParamSchema = z.object({
  paymentConceptId: z.string().uuid('Invalid payment concept ID format'),
})

type TPaymentConceptIdParam = z.infer<typeof PaymentConceptIdParamSchema>

const ActiveForDateParamSchema = z.object({
  paymentConceptId: z.string().uuid('Invalid payment concept ID format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

type TActiveForDateParam = z.infer<typeof ActiveForDateParamSchema>

/**
 * Controller for managing interest configuration resources.
 *
 * Endpoints:
 * - GET    /                                                      List configs (scoped by condominium from context)
 * - GET    /payment-concept/:paymentConceptId                    Get by payment concept
 * - GET    /payment-concept/:paymentConceptId/active/:date       Get active for date
 * - GET    /:id                                                   Get by ID
 * - POST   /                                                      Create config (condominiumId injected from context)
 * - PATCH  /:id                                                   Update config
 * - DELETE /:id                                                   Delete config
 */
export class InterestConfigurationsController extends BaseController<
  TInterestConfiguration,
  TInterestConfigurationCreate,
  TInterestConfigurationUpdate
> {
  constructor(repository: InterestConfigurationsRepository) {
    super(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN)] },
      {
        method: 'get',
        path: '/payment-concept/:paymentConceptId',
        handler: this.getByPaymentConceptId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(PaymentConceptIdParamSchema)],
      },
      {
        method: 'get',
        path: '/payment-concept/:paymentConceptId/active/:date',
        handler: this.getActiveForDate,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(ActiveForDateParamSchema)],
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
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), bodyValidator(interestConfigurationCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(interestConfigurationUpdateSchema),
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
    const repo = this.repository as InterestConfigurationsRepository

    const configs = await repo.getByCondominiumId(condominiumId)
    return ctx.ok({ data: configs })
  }

  protected override create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TInterestConfigurationCreate>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const entity = await this.repository.create({ ...ctx.body, condominiumId })
    return ctx.created({ data: entity })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByPaymentConceptId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TPaymentConceptIdParam>(c)
    const repo = this.repository as InterestConfigurationsRepository

    try {
      const configs = await repo.getByPaymentConceptId(ctx.params.paymentConceptId)
      return ctx.ok({ data: configs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getActiveForDate = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TActiveForDateParam>(c)
    const repo = this.repository as InterestConfigurationsRepository

    try {
      const config = await repo.getActiveForDate(ctx.params.paymentConceptId, ctx.params.date)

      if (!config) {
        return ctx.notFound({ error: 'No active interest configuration found for this date' })
      }

      return ctx.ok({ data: config })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
