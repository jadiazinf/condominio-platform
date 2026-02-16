import type { Context } from 'hono'
import type { TCondominium, TCondominiumCreate, TCondominiumUpdate, TCondominiumsQuerySchema } from '@packages/domain'
import type { CondominiumsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { queryValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { condominiumsQuerySchema } from '@packages/domain'
import { ManagementCompanyIdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'

/**
 * Platform-level controller for condominiums.
 *
 * Routes:
 * - GET /                                        SUPERADMIN — list all condominiums (paginated)
 * - GET /management-company/:managementCompanyId  Management company member — list company condominiums (paginated)
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
      {
        method: 'get',
        path: '/management-company/:managementCompanyId',
        handler: this.listByManagementCompany,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT', 'VIEWER'),
          queryValidator(condominiumsQuerySchema),
        ],
      },
    ]
  }

  private listPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TCondominiumsQuerySchema>(c)
    const repo = this.repository as CondominiumsRepository
    const result = await repo.listPaginated(ctx.query)
    return ctx.ok(result)
  }

  private listByManagementCompany = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TCondominiumsQuerySchema, { managementCompanyId: string }>(c)
    const repo = this.repository as CondominiumsRepository
    const result = await repo.listByManagementCompanyPaginated(ctx.params.managementCompanyId, ctx.query)
    return ctx.ok(result)
  }
}
