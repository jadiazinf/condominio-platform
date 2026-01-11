import type { Context } from 'hono'
import { z } from 'zod'
import type { TQuotaGenerationRule } from '@packages/domain'
import type {
  QuotaGenerationRulesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  PaymentConceptsRepository,
  QuotaFormulasRepository,
} from '@database/repositories'
import { HttpContext } from '../../context'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { createRouter } from '../create-router'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import {
  CreateQuotaGenerationRuleService,
  UpdateQuotaGenerationRuleService,
  GetRulesByCondominiumService,
  GetApplicableRuleService,
  GetEffectiveRulesForDateService,
} from '@src/services/quota-generation-rules'

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

const CreateQuotaGenerationRuleBodySchema = z.object({
  condominiumId: z.string().uuid(),
  buildingId: z.string().uuid().optional().nullable(),
  paymentConceptId: z.string().uuid(),
  quotaFormulaId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().nullable(),
})

type TCreateQuotaGenerationRuleBody = z.infer<typeof CreateQuotaGenerationRuleBodySchema>

const UpdateQuotaGenerationRuleBodySchema = z.object({
  buildingId: z.string().uuid().optional().nullable(),
  paymentConceptId: z.string().uuid().optional(),
  quotaFormulaId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().nullable(),
  isActive: z.boolean().optional(),
  updateReason: z.string().max(500).optional().nullable(),
})

type TUpdateQuotaGenerationRuleBody = z.infer<typeof UpdateQuotaGenerationRuleBodySchema>

const GetApplicableRuleQuerySchema = z.object({
  paymentConceptId: z.string().uuid(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  buildingId: z.string().uuid().optional(),
})

type TGetApplicableRuleQuery = z.infer<typeof GetApplicableRuleQuerySchema>

const GetEffectiveRulesQuerySchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
})

type TGetEffectiveRulesQuery = z.infer<typeof GetEffectiveRulesQuerySchema>

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for managing quota generation rules.
 *
 * Endpoints:
 * - GET    /                                     List all rules
 * - GET    /condominium/:condominiumId           Get rules for a condominium
 * - GET    /condominium/:condominiumId/applicable Get applicable rule
 * - GET    /condominium/:condominiumId/effective  Get effective rules for date
 * - GET    /:id                                  Get rule by ID
 * - POST   /                                     Create a new rule
 * - PUT    /:id                                  Update a rule
 * - DELETE /:id                                  Soft delete a rule
 */
export class QuotaGenerationRulesController {
  private readonly createQuotaGenerationRuleService: CreateQuotaGenerationRuleService
  private readonly updateQuotaGenerationRuleService: UpdateQuotaGenerationRuleService
  private readonly getRulesByCondominiumService: GetRulesByCondominiumService
  private readonly getApplicableRuleService: GetApplicableRuleService
  private readonly getEffectiveRulesForDateService: GetEffectiveRulesForDateService

  constructor(
    private readonly quotaGenerationRulesRepository: QuotaGenerationRulesRepository,
    private readonly condominiumsRepository: CondominiumsRepository,
    private readonly buildingsRepository: BuildingsRepository,
    private readonly paymentConceptsRepository: PaymentConceptsRepository,
    private readonly quotaFormulasRepository: QuotaFormulasRepository
  ) {
    // Initialize services
    this.createQuotaGenerationRuleService = new CreateQuotaGenerationRuleService(
      quotaGenerationRulesRepository,
      condominiumsRepository,
      buildingsRepository,
      paymentConceptsRepository,
      quotaFormulasRepository
    )
    this.updateQuotaGenerationRuleService = new UpdateQuotaGenerationRuleService(
      quotaGenerationRulesRepository,
      buildingsRepository,
      paymentConceptsRepository,
      quotaFormulasRepository
    )
    this.getRulesByCondominiumService = new GetRulesByCondominiumService(
      quotaGenerationRulesRepository
    )
    this.getApplicableRuleService = new GetApplicableRuleService(
      quotaGenerationRulesRepository
    )
    this.getEffectiveRulesForDateService = new GetEffectiveRulesForDateService(
      quotaGenerationRulesRepository
    )

    // Bind handlers
    this.list = this.list.bind(this)
    this.getById = this.getById.bind(this)
    this.getByCondominiumId = this.getByCondominiumId.bind(this)
    this.getApplicableRule = this.getApplicableRule.bind(this)
    this.getEffectiveRules = this.getEffectiveRules.bind(this)
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.delete = this.delete.bind(this)
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
        path: '/condominium/:condominiumId/applicable',
        handler: this.getApplicableRule,
        middlewares: [
          authMiddleware,
          paramsValidator(CondominiumIdParamSchema),
          queryValidator(GetApplicableRuleQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/condominium/:condominiumId/effective',
        handler: this.getEffectiveRules,
        middlewares: [
          authMiddleware,
          paramsValidator(CondominiumIdParamSchema),
          queryValidator(GetEffectiveRulesQuerySchema),
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
        middlewares: [authMiddleware, bodyValidator(CreateQuotaGenerationRuleBodySchema)],
      },
      {
        method: 'put',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(UpdateQuotaGenerationRuleBodySchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
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
      const rules = await this.quotaGenerationRulesRepository.listAll(ctx.query.includeInactive)
      return ctx.ok({ data: rules })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getById(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    try {
      const rule = await this.quotaGenerationRulesRepository.getById(ctx.params.id)

      if (!rule) {
        return ctx.notFound({ error: 'Rule not found' })
      }

      return ctx.ok({ data: rule })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByCondominiumId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TIncludeInactiveQuery, TCondominiumIdParam>(c)

    try {
      const result = await this.getRulesByCondominiumService.execute({
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

  private async getApplicableRule(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TGetApplicableRuleQuery, TCondominiumIdParam>(c)

    try {
      const result = await this.getApplicableRuleService.execute({
        condominiumId: ctx.params.condominiumId,
        paymentConceptId: ctx.query.paymentConceptId,
        targetDate: ctx.query.targetDate,
        buildingId: ctx.query.buildingId,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getEffectiveRules(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TGetEffectiveRulesQuery, TCondominiumIdParam>(c)

    try {
      const result = await this.getEffectiveRulesForDateService.execute({
        condominiumId: ctx.params.condominiumId,
        targetDate: ctx.query.targetDate,
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
    const ctx = this.ctx<TCreateQuotaGenerationRuleBody>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.createQuotaGenerationRuleService.execute({
        condominiumId: ctx.body.condominiumId,
        buildingId: ctx.body.buildingId,
        paymentConceptId: ctx.body.paymentConceptId,
        quotaFormulaId: ctx.body.quotaFormulaId,
        name: ctx.body.name,
        description: ctx.body.description,
        effectiveFrom: ctx.body.effectiveFrom,
        effectiveTo: ctx.body.effectiveTo,
        createdByUserId: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        if (result.code === 'BAD_REQUEST') {
          return ctx.badRequest({ error: result.error })
        }
        if (result.code === 'CONFLICT') {
          return ctx.conflict({ error: result.error })
        }
        return ctx.internalError({ error: result.error })
      }

      return ctx.created({ data: result.data, message: 'Rule created successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async update(c: Context): Promise<Response> {
    const ctx = this.ctx<TUpdateQuotaGenerationRuleBody, unknown, TIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.updateQuotaGenerationRuleService.execute({
        ruleId: ctx.params.id,
        buildingId: ctx.body.buildingId,
        paymentConceptId: ctx.body.paymentConceptId,
        quotaFormulaId: ctx.body.quotaFormulaId,
        name: ctx.body.name,
        description: ctx.body.description,
        effectiveFrom: ctx.body.effectiveFrom,
        effectiveTo: ctx.body.effectiveTo,
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

      return ctx.ok({ data: result.data, message: 'Rule updated successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async delete(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    try {
      const deleted = await this.quotaGenerationRulesRepository.delete(ctx.params.id)

      if (!deleted) {
        return ctx.notFound({ error: 'Rule not found' })
      }

      return ctx.ok({ message: 'Rule deactivated successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────

  private handleError(ctx: HttpContext, error: unknown): Response | Promise<Response> {
    console.error('QuotaGenerationRulesController error:', error)
    return ctx.internalError({ error: 'An unexpected error occurred' })
  }
}
