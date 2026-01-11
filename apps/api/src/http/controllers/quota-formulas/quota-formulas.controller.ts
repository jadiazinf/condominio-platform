import type { Context } from 'hono'
import { z } from 'zod'
import { EFormulaTypes, type TQuotaFormula } from '@packages/domain'
import type {
  QuotaFormulasRepository,
  CondominiumsRepository,
  UnitsRepository,
} from '@database/repositories'
import { HttpContext } from '../../context'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { createRouter } from '../create-router'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import {
  CreateQuotaFormulaService,
  UpdateQuotaFormulaService,
  GetFormulasByCondominiumService,
  CalculateFormulaAmountService,
} from '@src/services/quota-formulas'

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CondominiumIdParamSchema = z.object({
  condominiumId: z.string().uuid('Invalid condominium ID format'),
})

type TCondominiumIdParam = z.infer<typeof CondominiumIdParamSchema>

const IncludeInactiveQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
})

type TIncludeInactiveQuery = z.infer<typeof IncludeInactiveQuerySchema>

const CreateQuotaFormulaBodySchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  formulaType: z.enum(EFormulaTypes),
  fixedAmount: z.string().optional().nullable(),
  expression: z.string().max(500).optional().nullable(),
  variables: z.record(z.string(), z.unknown()).optional().nullable(),
  unitAmounts: z.record(z.string(), z.unknown()).optional().nullable(),
  currencyId: z.string().uuid(),
})

type TCreateQuotaFormulaBody = z.infer<typeof CreateQuotaFormulaBodySchema>

const UpdateQuotaFormulaBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  formulaType: z.enum(EFormulaTypes).optional(),
  fixedAmount: z.string().optional().nullable(),
  expression: z.string().max(500).optional().nullable(),
  variables: z.record(z.string(), z.unknown()).optional().nullable(),
  unitAmounts: z.record(z.string(), z.unknown()).optional().nullable(),
  currencyId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  updateReason: z.string().max(500).optional().nullable(),
})

type TUpdateQuotaFormulaBody = z.infer<typeof UpdateQuotaFormulaBodySchema>

const CalculateAmountBodySchema = z.object({
  unitId: z.string().uuid(),
  additionalVariables: z.record(z.string(), z.number()).optional(),
})

type TCalculateAmountBody = z.infer<typeof CalculateAmountBodySchema>

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for managing quota formulas.
 *
 * Endpoints:
 * - GET    /                                 List all formulas
 * - GET    /condominium/:condominiumId       Get formulas for a condominium
 * - GET    /:id                              Get formula by ID
 * - POST   /                                 Create a new formula
 * - PUT    /:id                              Update a formula
 * - DELETE /:id                              Soft delete a formula
 * - POST   /:id/calculate                    Calculate amount for a unit
 */
export class QuotaFormulasController {
  private readonly createQuotaFormulaService: CreateQuotaFormulaService
  private readonly updateQuotaFormulaService: UpdateQuotaFormulaService
  private readonly getFormulasByCondominiumService: GetFormulasByCondominiumService
  private readonly calculateFormulaAmountService: CalculateFormulaAmountService

  constructor(
    private readonly quotaFormulasRepository: QuotaFormulasRepository,
    private readonly condominiumsRepository: CondominiumsRepository,
    private readonly unitsRepository: UnitsRepository
  ) {
    // Initialize services
    this.createQuotaFormulaService = new CreateQuotaFormulaService(
      quotaFormulasRepository,
      condominiumsRepository
    )
    this.updateQuotaFormulaService = new UpdateQuotaFormulaService(quotaFormulasRepository)
    this.getFormulasByCondominiumService = new GetFormulasByCondominiumService(
      quotaFormulasRepository
    )
    this.calculateFormulaAmountService = new CalculateFormulaAmountService(
      quotaFormulasRepository,
      unitsRepository
    )

    // Bind handlers
    this.list = this.list.bind(this)
    this.getById = this.getById.bind(this)
    this.getByCondominiumId = this.getByCondominiumId.bind(this)
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.delete = this.delete.bind(this)
    this.calculateAmount = this.calculateAmount.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.list,
        middlewares: [authMiddleware, queryValidator(IncludeInactiveQuerySchema)],
      },
      {
        method: 'get',
        path: '/condominium/:condominiumId',
        handler: this.getByCondominiumId,
        middlewares: [
          authMiddleware,
          paramsValidator(CondominiumIdParamSchema),
          queryValidator(IncludeInactiveQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, bodyValidator(CreateQuotaFormulaBodySchema)],
      },
      {
        method: 'put',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(UpdateQuotaFormulaBodySchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/calculate',
        handler: this.calculateAmount,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(CalculateAmountBodySchema),
        ],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private ctx<TBody = unknown, TQuery = unknown, TParams = unknown>(c: Context) {
    return new HttpContext<TBody, TQuery, TParams>(c)
  }

  private async list(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TIncludeInactiveQuery>(c)

    try {
      const formulas = await this.quotaFormulasRepository.listAll(ctx.query.includeInactive)
      return ctx.ok({ data: formulas })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getById(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    try {
      const formula = await this.quotaFormulasRepository.getById(ctx.params.id)

      if (!formula) {
        return ctx.notFound({ error: 'Formula not found' })
      }

      return ctx.ok({ data: formula })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByCondominiumId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TIncludeInactiveQuery, TCondominiumIdParam>(c)

    try {
      const result = await this.getFormulasByCondominiumService.execute({
        condominiumId: ctx.params.condominiumId,
        includeInactive: ctx.query.includeInactive,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async create(c: Context): Promise<Response> {
    const ctx = this.ctx<TCreateQuotaFormulaBody>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.createQuotaFormulaService.execute({
        condominiumId: ctx.body.condominiumId,
        name: ctx.body.name,
        description: ctx.body.description,
        formulaType: ctx.body.formulaType,
        fixedAmount: ctx.body.fixedAmount,
        expression: ctx.body.expression,
        variables: ctx.body.variables,
        unitAmounts: ctx.body.unitAmounts,
        currencyId: ctx.body.currencyId,
        createdByUserId: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        if (result.code === 'BAD_REQUEST') {
          return ctx.badRequest({ error: result.error })
        }
        return ctx.internalError({ error: result.error })
      }

      return ctx.created({ data: result.data, message: 'Formula created successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async update(c: Context): Promise<Response> {
    const ctx = this.ctx<TUpdateQuotaFormulaBody, unknown, TIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.updateQuotaFormulaService.execute({
        formulaId: ctx.params.id,
        name: ctx.body.name,
        description: ctx.body.description,
        formulaType: ctx.body.formulaType,
        fixedAmount: ctx.body.fixedAmount,
        expression: ctx.body.expression,
        variables: ctx.body.variables,
        unitAmounts: ctx.body.unitAmounts,
        currencyId: ctx.body.currencyId,
        isActive: ctx.body.isActive,
        updatedByUserId: user.id,
        updateReason: ctx.body.updateReason,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        if (result.code === 'BAD_REQUEST') {
          return ctx.badRequest({ error: result.error })
        }
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data, message: 'Formula updated successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async delete(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    try {
      const deleted = await this.quotaFormulasRepository.delete(ctx.params.id)

      if (!deleted) {
        return ctx.notFound({ error: 'Formula not found' })
      }

      return ctx.ok({ message: 'Formula deactivated successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async calculateAmount(c: Context): Promise<Response> {
    const ctx = this.ctx<TCalculateAmountBody, unknown, TIdParam>(c)

    try {
      const result = await this.calculateFormulaAmountService.execute({
        formulaId: ctx.params.id,
        unitId: ctx.body.unitId,
        additionalVariables: ctx.body.additionalVariables,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        if (result.code === 'BAD_REQUEST') {
          return ctx.badRequest({ error: result.error })
        }
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────

  private handleError(ctx: HttpContext, error: unknown): Response | Promise<Response> {
    console.error('QuotaFormulasController error:', error)
    return ctx.internalError({ error: 'An unexpected error occurred' })
  }
}
