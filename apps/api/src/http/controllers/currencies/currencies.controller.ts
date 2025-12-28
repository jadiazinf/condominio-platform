import type { Context } from 'hono'
import {
  currencyCreateSchema,
  currencyUpdateSchema,
  type TCurrency,
  type TCurrencyCreate,
  type TCurrencyUpdate,
} from '@packages/domain'
import type { CurrenciesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema, CodeParamSchema, type TCodeParam } from '../common'
import type { TRouteDefinition } from '../types'

/**
 * Controller for managing currency resources.
 *
 * Endpoints:
 * - GET    /              List all currencies
 * - GET    /base          Get the base currency
 * - GET    /code/:code    Get currency by code
 * - GET    /:id           Get currency by ID
 * - POST   /              Create currency
 * - PATCH  /:id           Update currency
 * - DELETE /:id           Delete currency
 */
export class CurrenciesController extends BaseController<
  TCurrency,
  TCurrencyCreate,
  TCurrencyUpdate
> {
  constructor(repository: CurrenciesRepository) {
    super(repository)
    this.getByCode = this.getByCode.bind(this)
    this.getBaseCurrency = this.getBaseCurrency.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      { method: 'get', path: '/base', handler: this.getBaseCurrency },
      {
        method: 'get',
        path: '/code/:code',
        handler: this.getByCode,
        middlewares: [paramsValidator(CodeParamSchema)],
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
        middlewares: [bodyValidator(currencyCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(currencyUpdateSchema)],
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

  private async getByCode(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCodeParam>(c)
    const repo = this.repository as CurrenciesRepository

    try {
      const currency = await repo.getByCode(ctx.params.code)

      if (!currency) {
        return ctx.notFound({ error: 'Currency not found' })
      }

      return ctx.ok({ data: currency })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getBaseCurrency(c: Context): Promise<Response> {
    const ctx = this.ctx(c)
    const repo = this.repository as CurrenciesRepository

    try {
      const currency = await repo.getBaseCurrency()

      if (!currency) {
        return ctx.notFound({ error: 'No base currency configured' })
      }

      return ctx.ok({ data: currency })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
