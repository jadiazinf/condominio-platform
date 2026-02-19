import type { Context } from 'hono'
import {
  currencyCreateSchema,
  currencyUpdateSchema,
  type TCurrency,
  type TCurrencyCreate,
  type TCurrencyUpdate,
  ESystemRole,
} from '@packages/domain'
import type { CurrenciesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
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
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN)] },
      { method: 'get', path: '/base', handler: this.getBaseCurrency, middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN)] },
      {
        method: 'get',
        path: '/code/:code',
        handler: this.getByCode,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(CodeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), bodyValidator(currencyCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema), bodyValidator(currencyUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByCode = async (c: Context): Promise<Response> => {
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

  private getBaseCurrency = async (c: Context): Promise<Response> => {
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
