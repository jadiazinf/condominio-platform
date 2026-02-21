import type { Context } from 'hono'
import { z } from 'zod'
import {
  bankAccountCreateSchema,
  bankAccountsQuerySchema,
  type TBankAccount,
  type TBankAccountCreate,
  type TBankAccountsQuerySchema,
  ESystemRole,
} from '@packages/domain'
import type { BankAccountsRepository, BanksRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, MANAGEMENT_COMPANY_ID_PROP } from '../../middlewares/auth'
import { ManagementCompanyIdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { AppError } from '@errors/index'
import { CreateBankAccountService } from '@src/services/bank-accounts/create-bank-account.service'
import { DeactivateBankAccountService } from '@src/services/bank-accounts/deactivate-bank-account.service'
import type { TDrizzleClient } from '@database/repositories/interfaces'

const BankAccountIdParamSchema = z.object({
  managementCompanyId: z.string().uuid('Invalid managementCompanyId format'),
  bankAccountId: z.string().uuid('Invalid bankAccountId format'),
})

type TBankAccountIdParam = z.infer<typeof BankAccountIdParamSchema>

const allMcRoles = [ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.VIEWER] as const

export class BankAccountsController extends BaseController<TBankAccount, TBankAccountCreate, Partial<TBankAccountCreate>> {
  private readonly bankAccountsRepository: BankAccountsRepository
  private readonly createService: CreateBankAccountService
  private readonly deactivateService: DeactivateBankAccountService

  constructor(repository: BankAccountsRepository, banksRepository: BanksRepository, db: TDrizzleClient) {
    super(repository)
    this.bankAccountsRepository = repository
    this.createService = new CreateBankAccountService(db, repository, banksRepository)
    this.deactivateService = new DeactivateBankAccountService(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/:managementCompanyId/me/bank-accounts',
        handler: this.listBankAccounts,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(...allMcRoles),
          queryValidator(bankAccountsQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/bank-accounts/:bankAccountId',
        handler: this.getBankAccountDetail,
        middlewares: [
          authMiddleware,
          paramsValidator(BankAccountIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/bank-accounts',
        handler: this.createBankAccount,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(ESystemRole.ADMIN),
          bodyValidator(bankAccountCreateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/:managementCompanyId/me/bank-accounts/:bankAccountId/deactivate',
        handler: this.deactivateBankAccount,
        middlewares: [
          authMiddleware,
          paramsValidator(BankAccountIdParamSchema),
          requireRole(ESystemRole.ADMIN),
        ],
      },
    ]
  }

  private listBankAccounts = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TBankAccountsQuerySchema, { managementCompanyId: string }>(c)

    try {
      const result = await this.bankAccountsRepository.listByManagementCompanyPaginated(
        ctx.params.managementCompanyId,
        ctx.query
      )
      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getBankAccountDetail = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBankAccountIdParam>(c)

    try {
      const bankAccount = await this.bankAccountsRepository.getByIdWithCondominiums(ctx.params.bankAccountId)

      if (!bankAccount) {
        throw AppError.notFound('BankAccount', ctx.params.bankAccountId)
      }

      if (bankAccount.managementCompanyId !== ctx.params.managementCompanyId) {
        throw AppError.notFound('BankAccount', ctx.params.bankAccountId)
      }

      return ctx.ok({ data: bankAccount })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createBankAccount = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TBankAccountCreate, unknown, { managementCompanyId: string }>(c)
    const user = ctx.getAuthenticatedUser()

    try {
      const result = await this.createService.execute({
        ...ctx.body,
        managementCompanyId: ctx.params.managementCompanyId,
        createdBy: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private deactivateBankAccount = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBankAccountIdParam>(c)
    const user = ctx.getAuthenticatedUser()

    try {
      const result = await this.deactivateService.execute({
        bankAccountId: ctx.params.bankAccountId,
        managementCompanyId: ctx.params.managementCompanyId,
        deactivatedBy: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          throw AppError.notFound('BankAccount', ctx.params.bankAccountId)
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
