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
import { authMiddleware, requireRole } from '../../middlewares/auth'
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

type TExchangeRatesQuery = {
  page?: number
  limit?: number
  fromCurrencyId?: string
  toCurrencyId?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Controller for managing exchange rate resources.
 *
 * Endpoints:
 * - GET    /                                           List all exchange rates
 * - GET    /paginated                                  List with pagination and filters
 * - GET    /latest                                     Latest rate per currency pair
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
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('SUPERADMIN')] },
      { method: 'get', path: '/paginated', handler: this.listPaginated, middlewares: [authMiddleware, requireRole('SUPERADMIN')] },
      { method: 'get', path: '/latest', handler: this.getLatestRates, middlewares: [authMiddleware, requireRole('SUPERADMIN')] },
      {
        method: 'get',
        path: '/date/:date',
        handler: this.getByDate,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(DateParamSchema)],
      },
      {
        method: 'get',
        path: '/latest/:fromCurrencyId/:toCurrencyId',
        handler: this.getLatestRate,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(CurrencyPairParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), bodyValidator(exchangeRateCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema), bodyValidator(exchangeRateUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private listPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const repo = this.repository as ExchangeRatesRepository
    const raw = c.req.query()

    try {
      const result = await repo.getAllPaginated({
        page: raw.page ? parseInt(raw.page) : undefined,
        limit: raw.limit ? parseInt(raw.limit) : undefined,
        fromCurrencyId: raw.fromCurrencyId || undefined,
        toCurrencyId: raw.toCurrencyId || undefined,
        dateFrom: raw.dateFrom || undefined,
        dateTo: raw.dateTo || undefined,
      })

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getLatestRates = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const repo = this.repository as ExchangeRatesRepository

    try {
      const rates = await repo.getLatestRates()
      return ctx.ok({ data: rates })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getLatestRate = async (c: Context): Promise<Response> => {
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

  private getByDate = async (c: Context): Promise<Response> => {
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
