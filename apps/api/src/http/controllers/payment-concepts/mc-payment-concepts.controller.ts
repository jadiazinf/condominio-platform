import type { Context } from 'hono'
import { z } from 'zod'
import {
  paymentConceptCreateSchema,
  paymentConceptUpdateSchema,
  paymentConceptAssignmentUpdateSchema,
  paymentConceptsQuerySchema,
  type TPaymentConcept,
  type TPaymentConceptCreate,
  type TPaymentConceptUpdate,
  type TPaymentConceptAssignmentUpdate,
  type TPaymentConceptsQuerySchema,
  type TQuota,
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
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { CONDOMINIUM_ID_PROP } from '@src/http/middlewares/utils/auth/require-role'
import { ManagementCompanyIdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { CreatePaymentConceptService } from '@src/services/payment-concepts/create-payment-concept.service'
import { AssignPaymentConceptService } from '@src/services/payment-concepts/assign-payment-concept.service'
import { GenerateChargesService } from '@src/services/payment-concepts/generate-charges.service'
import { LinkBankAccountsService } from '@src/services/payment-concepts/link-bank-accounts.service'
import { LinkServiceToConceptService } from '@src/services/payment-concept-services/link-service-to-concept.service'
import { CreatePaymentConceptFullService, type ICreatePaymentConceptFullInput } from '@src/services/payment-concepts/create-payment-concept-full.service'
import { calculateUnitCharges, calculateElapsedPeriods } from '@src/services/payment-concepts/calculate-unit-charges'
import type { PaymentConceptServicesRepository, CondominiumServicesRepository, ServiceExecutionsRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { useTranslation } from '@intlify/hono'
import { LocaleDictionary } from '@locales/dictionary'

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

const linkServiceBodySchema = z.object({
  serviceId: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than 0'),
  useDefaultAmount: z.boolean().default(true),
})

const ServiceLinkIdParamSchema = z.object({
  managementCompanyId: z.string().uuid(),
  conceptId: z.string().uuid(),
  linkId: z.string().uuid(),
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

// ─── Full concept creation (concept + services + executions in one request) ──

const executionItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
})

const executionAttachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  storagePath: z.string().optional(),
})

const serviceWithExecutionSchema = z.object({
  serviceId: z.string().uuid(),
  amount: z.number().positive(),
  useDefaultAmount: z.boolean().default(true),
  execution: z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    executionDate: z.string().min(1),
    totalAmount: z.string().or(z.number()).transform(v => String(v)),
    currencyId: z.string().uuid(),
    status: z.enum(['draft', 'confirmed']).default('draft'),
    invoiceNumber: z.string().max(100).optional(),
    items: z.array(executionItemSchema).default([]),
    attachments: z.array(executionAttachmentSchema).default([]),
    notes: z.string().max(5000).optional(),
  }),
})

const paymentConceptCreateFullSchema = paymentConceptCreateSchema.extend({
  services: z.array(serviceWithExecutionSchema).default([]),
})

type TPaymentConceptCreateFullBody = z.infer<typeof paymentConceptCreateFullSchema>

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
    displayName: string
    bankName: string
    accountHolderName: string
    currency: string
    accountCategory: string
    accountDetails: Record<string, unknown>
  } | null>
}

type TBankAccountCondominiumsRepo = {
  getByBankAccountAndCondominium: (bankAccountId: string, condominiumId: string) => Promise<{ id: string } | null>
}

type TBuildingsRepo = {
  getById: (id: string) => Promise<{ id: string; condominiumId: string; name: string; isActive: boolean } | null>
  getByCondominiumId: (condominiumId: string) => Promise<{ id: string; condominiumId: string; name: string; isActive: boolean }[]>
}

type TUnitsRepo = {
  getById: (id: string) => Promise<{ id: string; buildingId: string; unitNumber: string; isActive: boolean; aliquotPercentage: string | null } | null>
  getByBuildingId: (buildingId: string) => Promise<{ id: string; buildingId: string; unitNumber: string; aliquotPercentage: string | null; isActive: boolean }[]>
  getByCondominiumId: (condominiumId: string) => Promise<{ id: string; buildingId: string; unitNumber: string; aliquotPercentage: string | null; isActive: boolean }[]>
}

type TQuotasRepo = {
  existsForConceptAndPeriod: (conceptId: string, year: number, month: number) => Promise<boolean>
  createMany: (quotas: Record<string, unknown>[]) => Promise<{ id: string }[]>
  getDelinquentByConcept: (conceptId: string, asOfDate: string) => Promise<TQuota[]>
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
  conceptServicesRepo: PaymentConceptServicesRepository
  condominiumServicesRepo: CondominiumServicesRepository
  executionsRepo: ServiceExecutionsRepository
}

export class McPaymentConceptsController extends BaseController<
  TPaymentConcept,
  TPaymentConceptCreate,
  TPaymentConceptUpdate
> {
  private readonly createService: CreatePaymentConceptService
  private readonly createFullService: CreatePaymentConceptFullService
  private readonly assignService: AssignPaymentConceptService
  private readonly generateService: GenerateChargesService
  private readonly linkService: LinkBankAccountsService
  private readonly linkServiceToConcept: LinkServiceToConceptService
  private readonly conceptsRepo: PaymentConceptsRepository
  private readonly assignmentsRepo: PaymentConceptAssignmentsRepository
  private readonly currenciesRepo: CurrenciesRepository
  private readonly bankAccountsRepo: TBankAccountsRepo
  private readonly buildingsRepo: TBuildingsRepo
  private readonly unitsRepo: TUnitsRepo
  private readonly quotasRepo: TQuotasRepo

  constructor(deps: IMcPaymentConceptsDeps) {
    super(deps.conceptsRepo)
    this.conceptsRepo = deps.conceptsRepo
    this.assignmentsRepo = deps.assignmentsRepo
    this.currenciesRepo = deps.currenciesRepo
    this.bankAccountsRepo = deps.bankAccountsRepo
    this.buildingsRepo = deps.buildingsRepo
    this.unitsRepo = deps.unitsRepo
    this.quotasRepo = deps.quotasRepo

    this.linkServiceToConcept = new LinkServiceToConceptService(
      deps.conceptServicesRepo,
      deps.conceptsRepo,
      deps.condominiumServicesRepo
    )

    this.createService = new CreatePaymentConceptService(
      deps.conceptsRepo,
      deps.condominiumsRepo,
      deps.currenciesRepo,
      deps.condominiumMCRepo
    )

    this.createFullService = new CreatePaymentConceptFullService(
      deps.db,
      deps.conceptsRepo,
      deps.condominiumsRepo,
      deps.currenciesRepo,
      deps.condominiumMCRepo,
      deps.conceptServicesRepo,
      deps.condominiumServicesRepo,
      deps.executionsRepo
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
          queryValidator(paymentConceptsQuerySchema),
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
        method: 'get',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/affected-units',
        handler: this.getAffectedUnits,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/delinquency',
        handler: this.getDelinquency,
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
        method: 'post',
        path: '/:managementCompanyId/me/payment-concepts/full',
        handler: this.createConceptFull,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(paymentConceptCreateFullSchema),
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

      // ── Concept Services ───────────────────────────────────────────
      {
        method: 'get',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/services',
        handler: this.listConceptServices,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/services',
        handler: this.linkConceptService,
        middlewares: [
          authMiddleware,
          paramsValidator(ConceptIdParamSchema),
          requireRole(...adminOnly),
          bodyValidator(linkServiceBodySchema),
        ],
      },
      {
        method: 'delete',
        path: '/:managementCompanyId/me/payment-concepts/:conceptId/services/:linkId',
        handler: this.unlinkConceptService,
        middlewares: [
          authMiddleware,
          paramsValidator(ServiceLinkIdParamSchema),
          requireRole(...adminOnly),
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
    const ctx = this.ctx<unknown, TPaymentConceptsQuerySchema, { managementCompanyId: string }>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    try {
      const query = { ...ctx.query, condominiumId }
      const result = await this.conceptsRepo.listByManagementCompanyPaginated(
        ctx.params.managementCompanyId,
        query
      )
      return ctx.ok(result)
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

      const [assignments, bankAccounts, currency] = await Promise.all([
        this.assignmentsRepo.listByConceptId(ctx.params.conceptId),
        this.linkService.listByConceptId(ctx.params.conceptId),
        this.currenciesRepo.getById(concept.currencyId),
      ])

      const bankAccountLinks = bankAccounts.success ? bankAccounts.data : []
      const enrichedBankAccounts = await Promise.all(
        bankAccountLinks.map(async (link) => {
          const account = await this.bankAccountsRepo.getById(link.bankAccountId)
          let maskedAccount: string | null = null
          if (account) {
            const accNum = (account.accountDetails as Record<string, unknown>)?.accountNumber as string | undefined
            if (accNum && accNum.length >= 4) {
              maskedAccount = '********' + accNum.slice(-4)
            }
          }
          return {
            ...link,
            bankAccount: account
              ? {
                  id: account.id,
                  displayName: account.displayName,
                  bankName: account.bankName,
                  accountHolderName: account.accountHolderName,
                  currency: account.currency,
                  accountCategory: account.accountCategory,
                  maskedAccountNumber: maskedAccount,
                }
              : null,
          }
        })
      )

      return ctx.ok({
        data: {
          ...concept,
          currency: currency ? { id: currency.id, code: currency.code, name: currency.name, symbol: currency.symbol } : null,
          assignments,
          bankAccounts: enrichedBankAccounts,
        },
      })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getAffectedUnits = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TConceptIdParam>(c)

    try {
      const concept = await this.conceptsRepo.getById(ctx.params.conceptId)
      if (!concept) {
        return ctx.notFound({ error: 'Payment concept not found' })
      }
      if (!concept.condominiumId) {
        return ctx.badRequest({ error: 'Concept has no condominium' })
      }

      const [assignments, allUnits, allBuildings] = await Promise.all([
        this.assignmentsRepo.listByConceptId(ctx.params.conceptId),
        this.unitsRepo.getByCondominiumId(concept.condominiumId),
        this.buildingsRepo.getByCondominiumId(concept.condominiumId),
      ])

      const buildingsMap = new Map(allBuildings.map(b => [b.id, { id: b.id, name: b.name }]))
      const unitsByBuilding = new Map<string, typeof allUnits>()
      for (const unit of allUnits) {
        const list = unitsByBuilding.get(unit.buildingId) ?? []
        list.push(unit)
        unitsByBuilding.set(unit.buildingId, list)
      }

      const unitCharges = calculateUnitCharges(assignments, allUnits, unitsByBuilding)

      const issueDay = concept.issueDay ?? 1
      const now = new Date()

      const result = unitCharges.map(uc => {
        const periodInfo = calculateElapsedPeriods(
          concept.createdAt,
          issueDay,
          concept.isRecurring ? (concept.recurrencePeriod as 'monthly' | 'quarterly' | 'yearly') : null,
          uc.baseAmount,
          now
        )
        return {
          ...uc,
          buildingName: buildingsMap.get(uc.buildingId)?.name ?? '',
          periodsCount: periodInfo.periodsCount,
          accumulatedAmount: periodInfo.accumulatedAmount,
          periods: periodInfo.periods,
        }
      })

      result.sort((a, b) => {
        const buildingCmp = a.buildingName.localeCompare(b.buildingName, 'es')
        if (buildingCmp !== 0) return buildingCmp
        return a.unitNumber.localeCompare(b.unitNumber, 'es', { numeric: true })
      })

      return ctx.ok({
        data: {
          isRecurring: concept.isRecurring,
          recurrencePeriod: concept.recurrencePeriod,
          issueDay,
          totalUnits: result.length,
          totalBaseAmount: result.reduce((sum, u) => sum + u.baseAmount, 0),
          units: result,
        },
      })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getDelinquency = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TConceptIdParam>(c)

    try {
      const concept = await this.conceptsRepo.getById(ctx.params.conceptId)
      if (!concept) return ctx.notFound({ error: 'Payment concept not found' })
      if (!concept.condominiumId) return ctx.badRequest({ error: 'Concept has no condominium' })

      const asOfDate = new Date().toISOString().split('T')[0]!

      const [delinquentQuotas, allUnits, allBuildings] = await Promise.all([
        this.quotasRepo.getDelinquentByConcept(ctx.params.conceptId, asOfDate),
        this.unitsRepo.getByCondominiumId(concept.condominiumId),
        this.buildingsRepo.getByCondominiumId(concept.condominiumId),
      ])

      const buildingsMap = new Map(allBuildings.map(b => [b.id, b.name]))
      const unitsMap = new Map(allUnits.map(u => [u.id, u]))

      const byUnit = new Map<string, typeof delinquentQuotas>()
      for (const q of delinquentQuotas) {
        const list = byUnit.get(q.unitId) ?? []
        list.push(q)
        byUnit.set(q.unitId, list)
      }

      const now = new Date()
      const units = Array.from(byUnit.entries()).map(([unitId, unitQuotas]) => {
        const unit = unitsMap.get(unitId)
        const totalBalance = unitQuotas.reduce((s, q) => s + Number(q.balance), 0)
        const totalInterestAmount = unitQuotas.reduce((s, q) => s + Number(q.interestAmount ?? 0), 0)
        const oldestDueDate = [...unitQuotas].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate

        return {
          unitId,
          unitNumber: unit?.unitNumber ?? '',
          buildingId: unit?.buildingId ?? '',
          buildingName: buildingsMap.get(unit?.buildingId ?? '') ?? '',
          overdueCount: unitQuotas.length,
          totalBalance,
          totalInterestAmount,
          oldestDueDate,
          quotas: unitQuotas.map(q => {
            const due = new Date(q.dueDate)
            const daysOverdue = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86_400_000))
            return {
              id: q.id,
              periodYear: q.periodYear,
              periodMonth: q.periodMonth,
              periodDescription: q.periodDescription,
              baseAmount: q.baseAmount,
              balance: q.balance,
              interestAmount: q.interestAmount ?? '0',
              dueDate: q.dueDate,
              daysOverdue,
              status: q.status,
            }
          }),
        }
      })

      units.sort((a, b) => {
        const bCmp = a.buildingName.localeCompare(b.buildingName, 'es')
        return bCmp !== 0 ? bCmp : a.unitNumber.localeCompare(b.unitNumber, 'es', { numeric: true })
      })

      return ctx.ok({
        data: {
          totalDelinquentUnits: units.length,
          totalBalance: units.reduce((s, u) => s + u.totalBalance, 0),
          totalInterestAmount: units.reduce((s, u) => s + u.totalInterestAmount, 0),
          units,
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

  private createConceptFull = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TPaymentConceptCreateFullBody, unknown, { managementCompanyId: string }>(c)
    const user = ctx.getAuthenticatedUser()
    const t = useTranslation(c)
    const dict = LocaleDictionary.http.controllers.paymentConcepts

    try {
      const { services, ...conceptData } = ctx.body

      const result = await this.createFullService.execute({
        ...conceptData,
        managementCompanyId: ctx.params.managementCompanyId,
        createdBy: user.id,
        services,
      } as ICreatePaymentConceptFullInput)

      if (!result.success) {
        const errorMap: Record<string, { method: 'notFound' | 'badRequest'; key: string }> = {
          CONDOMINIUM_NOT_FOUND: { method: 'notFound', key: dict.condominiumNotFound },
          CONDOMINIUM_NOT_IN_COMPANY: { method: 'notFound', key: dict.condominiumNotInCompany },
          CURRENCY_NOT_FOUND: { method: 'notFound', key: dict.currencyNotFound },
          SERVICE_NOT_FOUND: { method: 'notFound', key: dict.serviceNotFound },
          EXECUTION_CURRENCY_NOT_FOUND: { method: 'notFound', key: dict.executionCurrencyNotFound },
          SERVICES_REQUIRED: { method: 'badRequest', key: dict.servicesRequired },
        }

        const mapped = errorMap[result.error]
        if (mapped) {
          return ctx[mapped.method]({ error: t(mapped.key) })
        }

        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({
        data: result.data,
        message: t(dict.conceptCreatedSuccessfully),
      })
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

  // ─────────────────────────────────────────────────────────────────────────
  // Concept Service Handlers
  // ─────────────────────────────────────────────────────────────────────────

  private listConceptServices = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TConceptIdParam>(c)

    try {
      const services = await this.linkServiceToConcept.listByConceptId(ctx.params.conceptId)
      return ctx.ok({ data: services })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private linkConceptService = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<{ serviceId: string; amount: number; useDefaultAmount: boolean }, unknown, TConceptIdParam>(c)

    try {
      const result = await this.linkServiceToConcept.execute({
        paymentConceptId: ctx.params.conceptId,
        serviceId: ctx.body.serviceId,
        amount: ctx.body.amount,
        useDefaultAmount: ctx.body.useDefaultAmount,
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

  private unlinkConceptService = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { managementCompanyId: string; conceptId: string; linkId: string }>(c)

    try {
      const result = await this.linkServiceToConcept.unlinkById(ctx.params.linkId)

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
}
