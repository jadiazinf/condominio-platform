import type { Context } from 'hono'
import {
  interestConfigurationCreateSchema,
  interestConfigurationUpdateSchema,
  type TInterestConfiguration,
  type TInterestConfigurationCreate,
  type TInterestConfigurationUpdate,
} from '@packages/domain'
import type { InterestConfigurationsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const CondominiumIdParamSchema = z.object({
  condominiumId: z.string().uuid('Invalid condominium ID format'),
})

type TCondominiumIdParam = z.infer<typeof CondominiumIdParamSchema>

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
 * - GET    /                                                      List all configs
 * - GET    /condominium/:condominiumId                           Get by condominium
 * - GET    /payment-concept/:paymentConceptId                    Get by payment concept
 * - GET    /payment-concept/:paymentConceptId/active/:date       Get active for date
 * - GET    /:id                                                   Get by ID
 * - POST   /                                                      Create config
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
    this.getByCondominiumId = this.getByCondominiumId.bind(this)
    this.getByPaymentConceptId = this.getByPaymentConceptId.bind(this)
    this.getActiveForDate = this.getActiveForDate.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      {
        method: 'get',
        path: '/condominium/:condominiumId',
        handler: this.getByCondominiumId,
        middlewares: [paramsValidator(CondominiumIdParamSchema)],
      },
      {
        method: 'get',
        path: '/payment-concept/:paymentConceptId',
        handler: this.getByPaymentConceptId,
        middlewares: [paramsValidator(PaymentConceptIdParamSchema)],
      },
      {
        method: 'get',
        path: '/payment-concept/:paymentConceptId/active/:date',
        handler: this.getActiveForDate,
        middlewares: [paramsValidator(ActiveForDateParamSchema)],
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
        middlewares: [bodyValidator(interestConfigurationCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          paramsValidator(IdParamSchema),
          bodyValidator(interestConfigurationUpdateSchema),
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

  private async getByCondominiumId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCondominiumIdParam>(c)
    const repo = this.repository as InterestConfigurationsRepository

    try {
      const configs = await repo.getByCondominiumId(ctx.params.condominiumId)
      return ctx.ok({ data: configs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByPaymentConceptId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TPaymentConceptIdParam>(c)
    const repo = this.repository as InterestConfigurationsRepository

    try {
      const configs = await repo.getByPaymentConceptId(ctx.params.paymentConceptId)
      return ctx.ok({ data: configs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getActiveForDate(c: Context): Promise<Response> {
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
