import type { Context } from 'hono'
import type { TCondominium, TCondominiumCreate, TCondominiumUpdate, TCondominiumsQuerySchema } from '@packages/domain'
import type { CondominiumsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { queryValidator } from '../../middlewares/utils/payload-validator'
import { condominiumsQuerySchema } from '@packages/domain'
import type { TRouteDefinition } from '../types'

/**
 * Platform-level controller for condominiums.
 * SUPERADMIN only — lists all condominiums in the system with pagination.
 *
 * Path: /platform/condominiums
 */
export class PlatformCondominiumsController extends BaseController<
  TCondominium,
  TCondominiumCreate,
  TCondominiumUpdate
> {
  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listPaginated,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), queryValidator(condominiumsQuerySchema)],
      },
    ]
  }

  private listPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TCondominiumsQuerySchema>(c)
    const repo = this.repository as CondominiumsRepository
    const result = await repo.listPaginated(ctx.query)
    return ctx.ok(result)
  }
}
