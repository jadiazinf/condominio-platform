import type { Context } from 'hono'
import { z } from 'zod'
import {
  reserveFundPaymentsQuerySchema,
  reserveFundExpensesQuerySchema,
  ESystemRole,
} from '@packages/domain'
import type {
  QuotasRepository,
  PaymentsRepository,
  ExpensesRepository,
  DocumentsRepository,
  CondominiumServicesRepository,
  CondominiumsRepository,
  CurrenciesRepository,
} from '@database/repositories'
import { HttpContext } from '../../context'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import {
  paramsValidator,
  queryValidator,
  bodyValidator,
} from '../../middlewares/utils/payload-validator'
import { ManagementCompanyIdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { createRouter } from '../create-router'

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const summaryQuerySchema = z.object({
  condominiumId: z.string().uuid(),
})

const expenseIdParamSchema = ManagementCompanyIdParamSchema.extend({
  expenseId: z.string().uuid(),
})

const createExpenseBodySchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  expenseDate: z.string(),
  amount: z.string(),
  currencyId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).optional(),
  vendorName: z.string().max(255).optional(),
  vendorTaxId: z.string().max(100).optional(),
  vendorType: z.enum(['individual', 'company']).optional(),
  vendorPhone: z.string().max(50).optional(),
  vendorEmail: z.string().email().max(255).optional(),
  vendorAddress: z.string().max(500).optional(),
  invoiceNumber: z.string().max(100).optional(),
  notes: z.string().optional(),
  documents: z
    .array(
      z.object({
        title: z.string(),
        fileUrl: z.string().url(),
        fileName: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
      })
    )
    .optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────────────────────

const allMcRoles = [
  ESystemRole.ADMIN,
  ESystemRole.ACCOUNTANT,
  ESystemRole.SUPPORT,
  ESystemRole.VIEWER,
] as const
const writeMcRoles = [ESystemRole.ADMIN, ESystemRole.ACCOUNTANT] as const

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TManagementCompanyIdParam = z.infer<typeof ManagementCompanyIdParamSchema>
type TSummaryQuery = z.infer<typeof summaryQuerySchema>
type TCreateExpenseBody = z.infer<typeof createExpenseBodySchema>

export interface IMcReserveFundDeps {
  quotasRepo: QuotasRepository
  paymentsRepo: PaymentsRepository
  expensesRepo: ExpensesRepository
  documentsRepo: DocumentsRepository
  servicesRepo: CondominiumServicesRepository
  condominiumsRepo: CondominiumsRepository
  currenciesRepo: CurrenciesRepository
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

export class McReserveFundController {
  private readonly quotasRepo: QuotasRepository
  private readonly paymentsRepo: PaymentsRepository
  private readonly expensesRepo: ExpensesRepository
  private readonly documentsRepo: DocumentsRepository
  private readonly servicesRepo: CondominiumServicesRepository
  private readonly condominiumsRepo: CondominiumsRepository
  private readonly currenciesRepo: CurrenciesRepository

  constructor(deps: IMcReserveFundDeps) {
    this.quotasRepo = deps.quotasRepo
    this.paymentsRepo = deps.paymentsRepo
    this.expensesRepo = deps.expensesRepo
    this.documentsRepo = deps.documentsRepo
    this.servicesRepo = deps.servicesRepo
    this.condominiumsRepo = deps.condominiumsRepo
    this.currenciesRepo = deps.currenciesRepo
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/:managementCompanyId/me/reserve-fund/summary',
        handler: this.getSummary,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          queryValidator(summaryQuerySchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/reserve-fund/payments',
        handler: this.listPayments,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          queryValidator(reserveFundPaymentsQuerySchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/reserve-fund/expenses',
        handler: this.listExpenses,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          queryValidator(reserveFundExpensesQuerySchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/reserve-fund/expenses/:expenseId',
        handler: this.getExpenseDetail,
        middlewares: [
          authMiddleware,
          paramsValidator(expenseIdParamSchema),
          requireRole(...allMcRoles),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/reserve-fund/expenses',
        handler: this.createExpense,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          bodyValidator(createExpenseBodySchema),
          requireRole(...writeMcRoles),
        ],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  private getSummary = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, TSummaryQuery, TManagementCompanyIdParam>(c)
    const { condominiumId } = ctx.query

    const [summary, totalExpenses, condominium] = await Promise.all([
      this.quotasRepo.getReserveFundSummary(condominiumId),
      this.expensesRepo.getReserveFundExpensesTotal(condominiumId),
      this.condominiumsRepo.getById(condominiumId),
    ])

    let currencySymbol: string | null = null
    if (condominium?.defaultCurrencyId) {
      const currency = await this.currenciesRepo.getById(condominium.defaultCurrencyId)
      currencySymbol = currency?.symbol ?? null
    }

    return ctx.ok({ data: { ...summary, totalExpenses, currencySymbol } })
  }

  private listPayments = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<
      unknown,
      z.infer<typeof reserveFundPaymentsQuerySchema>,
      TManagementCompanyIdParam
    >(c)
    const { condominiumId, unitId, conceptId, startDate, endDate, page, limit } = ctx.query

    const result = await this.paymentsRepo.listReserveFundPaymentsPaginated(condominiumId, {
      page,
      limit,
      unitId,
      conceptId,
      startDate,
      endDate,
    })

    return ctx.ok(result)
  }

  private listExpenses = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<
      unknown,
      z.infer<typeof reserveFundExpensesQuerySchema>,
      TManagementCompanyIdParam
    >(c)
    const { condominiumId, status, startDate, endDate, page, limit } = ctx.query

    const result = await this.expensesRepo.listReserveFundExpensesPaginated(condominiumId, {
      page,
      limit,
      status,
      startDate,
      endDate,
    })

    return ctx.ok(result)
  }

  private getExpenseDetail = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, z.infer<typeof expenseIdParamSchema>>(c)
    const { expenseId } = ctx.params

    const [expense, expenseDocuments] = await Promise.all([
      this.expensesRepo.getById(expenseId),
      this.documentsRepo.getByExpenseId(expenseId),
    ])

    if (!expense) {
      return ctx.notFound({ error: 'Expense not found' })
    }

    // Resolve linked services from metadata
    const metadata = expense.metadata as Record<string, unknown> | null
    const serviceIds = (metadata?.serviceIds as string[] | null) ?? []
    const services = serviceIds.length > 0 ? await this.servicesRepo.getByIds(serviceIds) : []

    return ctx.ok({ data: { ...expense, documents: expenseDocuments, services } })
  }

  private createExpense = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<TCreateExpenseBody, unknown, TManagementCompanyIdParam>(c)
    const body = ctx.body
    const user = ctx.getAuthenticatedUser()

    const description = body.description ? `${body.name}\n${body.description}` : body.name

    const vendorMetadata =
      body.vendorType || body.vendorPhone || body.vendorEmail || body.vendorAddress
        ? {
            type: body.vendorType ?? null,
            phone: body.vendorPhone ?? null,
            email: body.vendorEmail ?? null,
            address: body.vendorAddress ?? null,
          }
        : null

    const expense = await this.expensesRepo.create({
      condominiumId: body.condominiumId,
      buildingId: null,
      expenseCategoryId: null,
      description,
      expenseDate: body.expenseDate,
      amount: body.amount,
      currencyId: body.currencyId,
      vendorName: body.vendorName ?? null,
      vendorTaxId: body.vendorTaxId ?? null,
      invoiceNumber: body.invoiceNumber ?? null,
      invoiceUrl: null,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      notes: body.notes ?? null,
      metadata: {
        fundSource: 'reserve_fund',
        serviceIds: body.serviceIds?.length ? body.serviceIds : null,
        vendor: vendorMetadata,
      },
      createdBy: user.id,
    })

    // Create document records for uploaded files
    if (body.documents?.length) {
      for (const doc of body.documents) {
        await this.documentsRepo.create({
          documentType: 'invoice',
          title: doc.title,
          description: null,
          condominiumId: body.condominiumId,
          buildingId: null,
          unitId: null,
          userId: null,
          paymentId: null,
          quotaId: null,
          expenseId: expense.id,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          documentDate: body.expenseDate,
          documentNumber: body.invoiceNumber ?? null,
          isPublic: false,
          metadata: null,
          createdBy: user.id,
        })
      }
    }

    return ctx.created({ data: expense })
  }
}
