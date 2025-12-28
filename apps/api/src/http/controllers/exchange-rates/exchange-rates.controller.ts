import type { Context } from 'hono'
import {
  exchangeRateCreateSchema,
  exchangeRateUpdateSchema,
  type TExchangeRate,
  type TExchangeRateCreate,
  type TExchangeRateUpdate,
} from '@packages/domain'
import type { ExchangeRatesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const CurrencyPairParamSchema = z.object({
  fromCurrencyId: z.string().uuid('Invalid from currency ID format'),
  toCurrencyId: z.string().uuid('Invalid to currency ID format'),
})

type TCurrencyPairParam = z.infer<typeof CurrencyPairParamSchema>

const DateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

type TDateParam = z.infer<typeof DateParamSchema>

/**
 * Controller for managing exchange rate resources.
 *
 * Endpoints:
 * - GET    /                                           List all exchange rates
 * - GET    /date/:date                                 Get by date
 * - GET    /latest/:fromCurrencyId/:toCurrencyId       Get latest rate for currency pair
 * - GET    /:id                                        Get by ID
 * - POST   /                                           Create exchange rate
 * - PATCH  /:id                                        Update exchange rate
 * - DELETE /:id                                        Delete exchange rate (hard delete)
 */
export class ExchangeRatesController extends BaseController<
  TExchangeRate,
  TExchangeRateCreate,
  TExchangeRateUpdate
> {
  constructor(repository: ExchangeRatesRepository) {
    super(repository)
    this.getLatestRate = this.getLatestRate.bind(this)
    this.getByDate = this.getByDate.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      {
        method: 'get',
        path: '/date/:date',
        handler: this.getByDate,
        middlewares: [paramsValidator(DateParamSchema)],
      },
      {
        method: 'get',
        path: '/latest/:fromCurrencyId/:toCurrencyId',
        handler: this.getLatestRate,
        middlewares: [paramsValidator(CurrencyPairParamSchema)],
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
        middlewares: [bodyValidator(exchangeRateCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(exchangeRateUpdateSchema)],
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

  private async getLatestRate(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCurrencyPairParam>(c)
    const repo = this.repository as ExchangeRatesRepository

    try {
      const rate = await repo.getLatestRate(ctx.params.fromCurrencyId, ctx.params.toCurrencyId)

      if (!rate) {
        return ctx.notFound({ error: 'Exchange rate not found' })
      }

      return ctx.ok({ data: rate })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByDate(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TDateParam>(c)
    const repo = this.repository as ExchangeRatesRepository

    try {
      const rates = await repo.getByDate(ctx.params.date)
      return ctx.ok({ data: rates })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
