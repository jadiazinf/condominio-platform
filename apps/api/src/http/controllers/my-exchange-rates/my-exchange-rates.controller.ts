import { z } from 'zod'
import type { Context } from 'hono'
import type { ExchangeRatesRepository } from '@database/repositories'
import type { TExchangeRate, TExchangeRateCreate, TExchangeRateUpdate } from '@packages/domain'
import { BaseController } from '../base.controller'
import { authMiddleware } from '../../middlewares/auth'
import { paramsValidator } from '../../middlewares/utils/payload-validator'
import type { TRouteDefinition } from '../types'

const DateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

type TDateParam = z.infer<typeof DateParamSchema>

/**
 * Public-facing exchange rates controller.
 * Any authenticated user can view the latest exchange rates.
 */
export class MyExchangeRatesController extends BaseController<TExchangeRate, TExchangeRateCreate, TExchangeRateUpdate> {
  constructor(repository: ExchangeRatesRepository) {
    super(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/latest', handler: this.getLatestRates, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/effective/:date',
        handler: this.getEffectiveRatesByDate,
        middlewares: [authMiddleware, paramsValidator(DateParamSchema)],
      },
    ]
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

  private getEffectiveRatesByDate = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TDateParam>(c)
    const repo = this.repository as ExchangeRatesRepository

    try {
      const rates = await repo.getEffectiveRatesByDate(ctx.params.date)
      return ctx.ok({ data: rates })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
