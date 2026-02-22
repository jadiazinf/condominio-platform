import type { Context } from 'hono'
import { z } from 'zod'
import {
  paymentConceptCreateSchema,
  paymentConceptUpdateSchema,
  paymentConceptAssignmentUpdateSchema,
  type TPaymentConcept,
  type TPaymentConceptCreate,
  type TPaymentConceptUpdate,
  type TPaymentConceptAssignmentUpdate,
  ESystemRole,
} from '@packages/domain'
import type {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
  PaymentConceptBankAccountsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { ManagementCompanyIdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { CreatePaymentConceptService } from '@src/services/payment-concepts/create-payment-concept.service'
import { AssignPaymentConceptService } from '@src/services/payment-concepts/assign-payment-concept.service'
import { GenerateChargesService } from '@src/services/payment-concepts/generate-charges.service'
import { LinkBankAccountsService } from '@src/services/payment-concepts/link-bank-accounts.service'
import type { TDrizzleClient } from '@database/repositories/interfaces'

// ─────────────────────────────────────────────────────────────────────────────
// Param Schemas
// ─────────────────────────────────────────────────────────────────────────────

const ConceptIdParamSchema = z.object({
  managementCompanyId: z.string().uuid(),
  conceptId: z.string().uuid(),
})

const AssignmentIdParamSchema = z.object({
  managementCompanyId: z.string().uuid(),
  conceptId: z.string().uuid(),
  assignmentId: z.string().uuid(),
})

const BankAccountLinkIdParamSchema = z.object({
  managementCompanyId: z.string().uuid(),
  conceptId: z.string().uuid(),
  linkId: z.string().uuid(),
})

type TConceptIdParam = z.infer<typeof ConceptIdParamSchema>
type TAssignmentIdParam = z.infer<typeof AssignmentIdParamSchema>
type TBankAccountLinkIdParam = z.infer<typeof BankAccountLinkIdParamSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Generate body schema
// ─────────────────────────────────────────────────────────────────────────────

const generateChargesBodySchema = z.object({
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12),
})

const linkBankAccountBodySchema = z.object({
  bankAccountId: z.string().uuid(),
})

// Body-only schema for assignment creation (paymentConceptId comes from URL params)
const assignmentCreateBodySchema = z
  .object({
    scopeType: z.enum(['condominium', 'building', 'unit'] as const),
    condominiumId: z.string().uuid(),
    buildingId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    distributionMethod: z.enum(['by_aliquot', 'equal_split', 'fixed_per_unit'] as const),
    amount: z.number().positive('Amount must be greater than 0'),
  })
  .superRefine((data, ctx) => {
    if (data.scopeType === 'building' && !data.buildingId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Building ID is required when scope is building',
        path: ['buildingId'],
      })
    }
    if (data.scopeType === 'unit' && !data.unitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unit ID is required when scope is unit',
        path: ['unitId'],
      })
    }
    if (data.scopeType === 'unit' && data.distributionMethod !== 'fixed_per_unit') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unit-level assignments must use fixed_per_unit distribution',
        path: ['distributionMethod'],
      })
    }
  })

type TAssignmentCreateBody = z.infer<typeof assignmentCreateBodySchema>

// ─────────────────────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────────────────────

const allMcRoles = [ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.VIEWER] as const
const adminOnly = [ESystemRole.ADMIN] as const

// ─────────────────────────────────────────────────────────────────────────────
// Types for constructor dependencies
// ─────────────────────────────────────────────────────────────────────────────

type TCondominiumMCRepo = {
  getByCondominiumAndMC: (condominiumId: string, mcId: string) => Promise<{ id: string } | null>
}

type TBankAccountsRepo = {
  getById: (id: string) => Promise<{
    id: string
    managementCompanyId: string
    isActive: boolean
    appliesToAllCondominiums: boolean
  } | null>
}

type TBankAccountCondominiumsRepo = {
  getByBankAccountAndCondominium: (bankAccountId: string, condominiumId: string) => Promise<{ id: string } | null>
}

type TBuildingsRepo = {
  getById: (id: string) => Promise<{ id: string; condominiumId: string; isActive: boolean } | null>
}

type TUnitsRepo = {
  getById: (id: string) => Promise<{ id: string; buildingId: string; isActive: boolean; aliquotPercentage: string | null } | null>
  getByBuildingId: (buildingId: string) => Promise<{ id: string; buildingId: string; aliquotPercentage: string | null; isActive: boolean }[]>
  getByCondominiumId: (condominiumId: string) => Promise<{ id: string; buildingId: string; aliquotPercentage: string | null; isActive: boolean }[]>
}

type TQuotasRepo = {
  existsForConceptAndPeriod: (conceptId: string, year: number, month: number) => Promise<boolean>
  createMany: (quotas: Record<string, unknown>[]) => Promise<{ id: string }[]>
}

export interface IMcPaymentConceptsDeps {
  db: TDrizzleClient
  conceptsRepo: PaymentConceptsRepository
  assignmentsRepo: PaymentConceptAssignmentsRepository
  conceptBankAccountsRepo: PaymentConceptBankAccountsRepository
  condominiumsRepo: CondominiumsRepository
  currenciesRepo: CurrenciesRepository
  condominiumMCRepo: TCondominiumMCRepo
  bankAccountsRepo: TBankAccountsRepo
  bankAccountCondominiumsRepo: TBankAccountCondominiumsRepo
  buildingsRepo: TBuildingsRepo
  unitsRepo: TUnitsRepo
  quotasRepo: TQuotasRepo
}

export class McPaymentConceptsController extends BaseController<
  TPaymentConcept,
  TPaymentConceptCreate,
  TPaymentConceptUpdate
> {
  private readonly createService: CreatePaymentConceptService
  private readonly assignService: AssignPaymentConceptService
  private readonly generateService: GenerateChargesService
  private readonly linkService: LinkBankAccountsService
  private readonly conceptsRepo: PaymentConceptsRepository
  private readonly assignmentsRepo: PaymentConceptAssignmentsRepository
  private readonly currenciesRepo: CurrenciesRepository

  constructor(deps: IMcPaymentConceptsDeps) {
    super(deps.conceptsRepo)
    this.conceptsRepo = deps.conceptsRepo
    this.assignmentsRepo = deps.assignmentsRepo
    this.currenciesRepo = deps.currenciesRepo

    this.createService = new CreatePaymentConceptService(
      deps.conceptsRepo,
      deps.condominiumsRepo,
      deps.currenciesRepo,
      deps.condominiumMCRepo
    )

    this.assignService = new AssignPaymentConceptService(
      deps.conceptsRepo,
      deps.assignmentsRepo,
      deps.buildingsRepo,
      deps.unitsRepo
    )

    this.generateService = new GenerateChargesService(
      deps.db,
      deps.conceptsRepo,
      deps.assignmentsRepo,
      deps.unitsRepo,
      deps.quotasRepo
    )

    this.linkService = new LinkBankAccountsService(
      deps.conceptsRepo,
      deps.bankAccountsRepo,
      deps.bankAccountCondominiumsRepo,
      deps.conceptBankAccountsRepo
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      // ── Currencies (for forms) ──────────────────────────────────
      {
        method: 'get',
        path: '/:managementCompanyId/me/currencies',
        handler: this.listCurrencies,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },

      // ── Concept CRUD ──────────────────────────────────────────────
      {
        method: 'get',
        path: '/:managementCompanyId/me/payment-concepts',
        handler: this.listConcepts,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId',
        handler: this.getConceptDetail,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/payment-concepts',
        handler: this.createConcept,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(paymentConceptCreateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId',
        handler: this.updateConcept,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(paymentConceptUpdateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/deactivate',
        handler: this.deactivateConcept,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...adminOnly),
        ],
      },

      // ── Assignments ───────────────────────────────────────────────
      {
        method: 'get',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/assignments',
        handler: this.listAssignments,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/assignments',
        handler: this.createAssignment,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(assignmentCreateBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/assignments/:assignmentId',
        handler: this.updateAssignment,
        middlewares: [
          authMiddleware,
          paramsValidator(AssignmentIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(paymentConceptAssignmentUpdateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/assignments/:assignmentId/deactivate',
        handler: this.deactivateAssignment,
        middlewares: [
          authMiddleware,
          paramsValidator(AssignmentIdParamSchema),
          requireRole(...adminOnly),
        ],
      },

      // ── Bank Accounts ─────────────────────────────────────────────
      {
        method: 'get',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/bank-accounts',
        handler: this.listBankAccounts,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/bank-accounts',
        handler: this.linkBankAccount,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(linkBankAccountBodySchema),
        ],
      },
      {
        method: 'delete',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/bank-accounts/:linkId',
        handler: this.unlinkBankAccount,
        middlewares: [
          authMiddleware,
          paramsValidator(BankAccountLinkIdParamSchema),
          requireRole(...adminOnly),
        ],
      },

      // ── Generate Charges ──────────────────────────────────────────
      {
        method: 'post',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/generate',
        handler: this.generateCharges,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(generateChargesBodySchema),
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Concept Handlers
  // ─────────────────────────────────────────────────────────────────────────

  private listCurrencies = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { managementCompanyId: string }>(c)

    try {
      const currencies = await this.currenciesRepo.listAll()
      return ctx.ok({ data: currencies })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private listConcepts = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { managementCompanyId: string }>(c)

    try {
      const concepts = await this.conceptsRepo.listAll()
      return ctx.ok({ data: concepts })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getConceptDetail = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TConceptIdParam>(c)

    try {
      const concept = await this.conceptsRepo.getById(ctx.params.conceptId)
      if (!concept) {
        return ctx.notFound({ error: 'Payment concept not found' })
      }

      const assignments = await this.assignmentsRepo.listByConceptId(ctx.params.conceptId)
      const bankAccounts = await this.linkService.listByConceptId(ctx.params.conceptId)

      return ctx.ok({
        data: {
          ...concept,
          assignments,
          bankAccounts: bankAccounts.success ? bankAccounts.data : [],
        },
      })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createConcept = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TPaymentConceptCreate, unknown, { managementCompanyId: string }>(c)
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

  private updateConcept = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TPaymentConceptUpdate, unknown, TConceptIdParam>(c)

    try {
      const concept = await this.conceptsRepo.update(ctx.params.conceptId, ctx.body)
      if (!concept) {
        return ctx.notFound({ error: 'Payment concept not found' })
      }
      return ctx.ok({ data: concept })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private deactivateConcept = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TConceptIdParam>(c)

    try {
      const concept = await this.conceptsRepo.update(ctx.params.conceptId, { isActive: false } as TPaymentConceptUpdate)
      if (!concept) {
        return ctx.notFound({ error: 'Payment concept not found' })
      }
      return ctx.ok({ data: concept })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Assignment Handlers
  // ─────────────────────────────────────────────────────────────────────────

  private listAssignments = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TConceptIdParam>(c)

    try {
      const assignments = await this.assignmentsRepo.listByConceptId(ctx.params.conceptId)
      return ctx.ok({ data: assignments })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createAssignment = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TAssignmentCreateBody, unknown, TConceptIdParam>(c)
    const user = ctx.getAuthenticatedUser()

    try {
      const result = await this.assignService.execute({
        paymentConceptId: ctx.params.conceptId,
        scopeType: ctx.body.scopeType,
        condominiumId: ctx.body.condominiumId,
        buildingId: ctx.body.buildingId,
        unitId: ctx.body.unitId,
        distributionMethod: ctx.body.distributionMethod,
        amount: ctx.body.amount,
        assignedBy: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        if (result.code === 'CONFLICT') {
          return ctx.conflict({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private updateAssignment = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TPaymentConceptAssignmentUpdate, unknown, TAssignmentIdParam>(c)

    try {
      const updated = await this.assignmentsRepo.update(ctx.params.assignmentId, ctx.body)
      if (!updated) {
        return ctx.notFound({ error: 'Assignment not found' })
      }
      return ctx.ok({ data: updated })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private deactivateAssignment = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TAssignmentIdParam>(c)

    try {
      const result = await this.assignService.deactivate(ctx.params.assignmentId)

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bank Account Handlers
  // ─────────────────────────────────────────────────────────────────────────

  private listBankAccounts = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TConceptIdParam>(c)

    try {
      const result = await this.linkService.listByConceptId(ctx.params.conceptId)

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private linkBankAccount = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<{ bankAccountId: string }, unknown, TConceptIdParam>(c)
    const user = ctx.getAuthenticatedUser()

    try {
      const result = await this.linkService.link({
        paymentConceptId: ctx.params.conceptId,
        bankAccountId: ctx.body.bankAccountId,
        managementCompanyId: ctx.params.managementCompanyId,
        assignedBy: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        if (result.code === 'CONFLICT') {
          return ctx.conflict({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private unlinkBankAccount = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBankAccountLinkIdParam>(c)

    try {
      const result = await this.linkService.unlink({
        paymentConceptId: ctx.params.conceptId,
        bankAccountId: ctx.params.linkId,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: { success: true } })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Charges Handler
  // ─────────────────────────────────────────────────────────────────────────

  private generateCharges = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<{ periodYear: number; periodMonth: number }, unknown, TConceptIdParam>(c)
    const user = ctx.getAuthenticatedUser()

    try {
      const result = await this.generateService.execute({
        paymentConceptId: ctx.params.conceptId,
        periodYear: ctx.body.periodYear,
        periodMonth: ctx.body.periodMonth,
        generatedBy: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        if (result.code === 'CONFLICT') {
          return ctx.conflict({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
