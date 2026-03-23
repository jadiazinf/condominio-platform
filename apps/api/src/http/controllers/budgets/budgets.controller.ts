import type { Context } from 'hono'
import { z } from 'zod'
import {
  budgetCreateSchema,
  budgetUpdateSchema,
  budgetItemCreateSchema,
  type TBudget,
  type TBudgetCreate,
  type TBudgetUpdate,
  ESystemRole,
} from '@packages/domain'
import type {
  BudgetsRepository,
  BudgetItemsRepository,
  ExpensesRepository,
  UnitsRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { CreateBudgetService } from '@services/budgets/create-budget.service'
import { CalculateOrdinaryQuotaService } from '@services/budgets/calculate-ordinary-quota.service'
import { BudgetVsActualService } from '@services/budgets/budget-vs-actual.service'

// ─── Validation Schemas ──────────────────────────────────────────────────────

const CreateBudgetBodySchema = budgetCreateSchema.extend({
  items: z.array(budgetItemCreateSchema.omit({ budgetId: true })).min(1),
})

type TCreateBudgetBody = z.infer<typeof CreateBudgetBodySchema>

const UpdateBudgetBodySchema = budgetUpdateSchema

// ─── Controller ──────────────────────────────────────────────────────────────

export class BudgetsController extends BaseController<TBudget, TBudgetCreate, TBudgetUpdate> {
  private readonly budgetsRepository: BudgetsRepository
  private readonly createBudgetService: CreateBudgetService
  private readonly calculateQuotaService: CalculateOrdinaryQuotaService
  private readonly budgetVsActualService: BudgetVsActualService

  constructor(
    budgetsRepo: BudgetsRepository,
    private readonly budgetItemsRepo: BudgetItemsRepository,
    private readonly expensesRepo: ExpensesRepository,
    private readonly unitsRepo: UnitsRepository
  ) {
    super(budgetsRepo)
    this.budgetsRepository = budgetsRepo
    this.createBudgetService = new CreateBudgetService(budgetsRepo, budgetItemsRepo)
    this.calculateQuotaService = new CalculateOrdinaryQuotaService(
      budgetsRepo,
      budgetItemsRepo,
      unitsRepo
    )
    this.budgetVsActualService = new BudgetVsActualService(
      budgetsRepo,
      budgetItemsRepo,
      expensesRepo
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.list,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getByIdWithItems,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'post',
        path: '/',
        handler: this.createBudget,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          bodyValidator(CreateBudgetBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
          bodyValidator(UpdateBudgetBodySchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/:id/calculate-quotas',
        handler: this.calculateQuotas,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/:id/vs-actual',
        handler: this.budgetVsActual,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
        ],
      },
    ]
  }

  // ─── Custom Handlers ────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const budgets = await this.budgetsRepository.getByCondominiumId(condominiumId)
    return ctx.ok({ data: budgets })
  }

  protected getByIdWithItems = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const budget = await this.budgetsRepository.getById(ctx.params.id)
    if (!budget) return ctx.notFound({ error: 'Presupuesto no encontrado' })

    const items = await this.budgetItemsRepo.getByBudgetId(budget.id)
    return ctx.ok({ data: { ...budget, items } })
  }

  protected createBudget = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCreateBudgetBody>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const userId = c.get('userId') as string | undefined

    const result = await this.createBudgetService.execute({
      ...ctx.body,
      condominiumId,
      createdBy: userId ?? null,
    })

    if (!result.success) {
      if (result.code === 'CONFLICT') return ctx.conflict({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    return ctx.created({ data: result.data })
  }

  protected calculateQuotas = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    const result = await this.calculateQuotaService.execute({
      budgetId: ctx.params.id,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    return ctx.ok({ data: result.data })
  }

  protected budgetVsActual = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    const result = await this.budgetVsActualService.execute({
      budgetId: ctx.params.id,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    return ctx.ok({ data: result.data })
  }
}
