import type { Context } from 'hono'
import type { CurrenciesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { authMiddleware } from '../../middlewares/auth'
import type { TRouteDefinition } from '../types'
import type { TCurrency, TCurrencyCreate, TCurrencyUpdate } from '@packages/domain'

/**
 * Public-facing currencies controller.
 * Any authenticated user can list active currencies.
 */
export class MyCurrenciesController extends BaseController<TCurrency, TCurrencyCreate, TCurrencyUpdate> {
  constructor(repository: CurrenciesRepository) {
    super(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
    ]
  }
}
