import type { Context } from 'hono'
import type { ExchangeRatesRepository } from '@database/repositories'
import type { TExchangeRate, TExchangeRateCreate, TExchangeRateUpdate } from '@packages/domain'
import { BaseController } from '../base.controller'
import { authMiddleware } from '../../middlewares/auth'
import type { TRouteDefinition } from '../types'

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
}
