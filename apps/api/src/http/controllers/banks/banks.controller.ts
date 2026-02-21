import type { Context } from 'hono'
import {
  banksQuerySchema,
  type TBank,
  type TBankCreate,
  type TBanksQuerySchema,
  ESystemRole,
} from '@packages/domain'
import type { BanksRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import type { TRouteDefinition } from '../types'

export class BanksController extends BaseController<TBank, TBankCreate, Partial<TBankCreate>> {
  private readonly banksRepository: BanksRepository

  constructor(repository: BanksRepository) {
    super(repository)
    this.banksRepository = repository
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listFiltered,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.SUPERADMIN,
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.VIEWER
          ),
          queryValidator(banksQuerySchema),
        ],
      },
    ]
  }

  private listFiltered = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TBanksQuerySchema>(c)

    try {
      const banks = await this.banksRepository.listFiltered(ctx.query)
      return ctx.ok({ data: banks })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
