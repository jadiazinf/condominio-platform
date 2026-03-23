import type { Context } from 'hono'
import { z } from 'zod'
import {
  condominiumReceiptUpdateSchema,
  type TCondominiumReceipt,
  type TCondominiumReceiptCreate,
  type TCondominiumReceiptUpdate,
  ESystemRole,
} from '@packages/domain'
import type {
  CondominiumReceiptsRepository,
  QuotasRepository,
  UnitsRepository,
  BuildingsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
  UnitOwnershipsRepository,
  PaymentConceptServicesRepository,
  ManagementCompaniesRepository,
  ExchangeRatesRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import {
  authMiddleware,
  requireRole,
  CONDOMINIUM_ID_PROP,
  USER_ROLE_PROP,
} from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { GenerateCondominiumReceiptService } from '@services/receipts/generate-condominium-receipt.service'
import { BulkGenerateReceiptsService } from '@services/receipts/bulk-generate-receipts.service'
import { GenerateReceiptPdfService } from '@services/receipts/generate-receipt-pdf.service'
import { SendReceiptEmailService } from '@services/email/send-receipt-email.service'
import logger from '@utils/logger'

// ─── Validation Schemas ──────────────────────────────────────────────────────

const GenerateReceiptBodySchema = z.object({
  unitId: z.uuid(),
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  currencyId: z.uuid(),
  budgetId: z.uuid().nullable().optional(),
})

const BulkGenerateBodySchema = z.object({
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  currencyId: z.uuid(),
  budgetId: z.uuid().nullable().optional(),
})

const PeriodQuerySchema = z.object({
  periodYear: z.coerce.number().int().optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  unitId: z.string().optional(),
})

const PaginatedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  startDate: z.string().optional(), // YYYY-MM
  endDate: z.string().optional(), // YYYY-MM
  conceptId: z.string().optional(),
})

// ─── Controller ──────────────────────────────────────────────────────────────

export class ReceiptsController extends BaseController<
  TCondominiumReceipt,
  TCondominiumReceiptCreate,
  TCondominiumReceiptUpdate
> {
  private readonly receiptsRepository: CondominiumReceiptsRepository
  private readonly quotasRepo: QuotasRepository
  private readonly generateReceiptService: GenerateCondominiumReceiptService
  private readonly bulkGenerateService: BulkGenerateReceiptsService
  private readonly receiptPdfService: GenerateReceiptPdfService
  private readonly sendReceiptEmailService: SendReceiptEmailService
  private readonly unitOwnershipsRepo: UnitOwnershipsRepository
  private readonly condominiumsRepo: CondominiumsRepository
  private readonly currenciesRepo: CurrenciesRepository
  private readonly conceptServicesRepo: PaymentConceptServicesRepository

  constructor(
    receiptsRepo: CondominiumReceiptsRepository,
    quotasRepo: QuotasRepository,
    unitsRepo: UnitsRepository,
    buildingsRepo: BuildingsRepository,
    condominiumsRepo: CondominiumsRepository,
    currenciesRepo: CurrenciesRepository,
    unitOwnershipsRepo: UnitOwnershipsRepository,
    conceptServicesRepo: PaymentConceptServicesRepository,
    managementCompaniesRepo?: ManagementCompaniesRepository,
    exchangeRatesRepo?: ExchangeRatesRepository
  ) {
    super(receiptsRepo)
    this.receiptsRepository = receiptsRepo
    this.quotasRepo = quotasRepo
    this.generateReceiptService = new GenerateCondominiumReceiptService(
      receiptsRepo,
      quotasRepo,
      unitsRepo,
      buildingsRepo
    )
    this.bulkGenerateService = new BulkGenerateReceiptsService(
      this.generateReceiptService,
      unitsRepo,
      condominiumsRepo
    )
    this.receiptPdfService = new GenerateReceiptPdfService(
      receiptsRepo,
      quotasRepo,
      unitsRepo,
      buildingsRepo,
      condominiumsRepo,
      currenciesRepo,
      conceptServicesRepo,
      managementCompaniesRepo,
      exchangeRatesRepo
    )
    this.sendReceiptEmailService = new SendReceiptEmailService()
    this.unitOwnershipsRepo = unitOwnershipsRepo
    this.condominiumsRepo = condominiumsRepo
    this.currenciesRepo = currenciesRepo
    this.conceptServicesRepo = conceptServicesRepo
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listReceipts,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
          queryValidator(PeriodQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/paginated',
        handler: this.listPaginated,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
          queryValidator(PaginatedQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getByIdWithItems,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'post',
        path: '/generate',
        handler: this.generateReceipt,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          bodyValidator(GenerateReceiptBodySchema),
        ],
      },
      {
        method: 'post',
        path: '/bulk-generate',
        handler: this.bulkGenerate,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          bodyValidator(BulkGenerateBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(condominiumReceiptUpdateSchema),
        ],
      },
      {
        method: 'get',
        path: '/:id/pdf',
        handler: this.downloadPdf,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'post',
        path: '/:id/send',
        handler: this.sendReceipt,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'post',
        path: '/:id/void',
        handler: this.voidReceipt,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          paramsValidator(IdParamSchema),
        ],
      },
    ]
  }

  // ─── Custom Handlers ────────────────────────────────────────────────────────

  protected listReceipts = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, { periodYear?: number; periodMonth?: number; unitId?: string }>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const userRole = c.get(USER_ROLE_PROP) as string
    const { periodYear, periodMonth, unitId } = ctx.query

    // Residents can only see their own receipts
    if (userRole === ESystemRole.USER) {
      const user = ctx.getAuthenticatedUser()
      const ownerships = await this.unitOwnershipsRepo.getByUserId(user.id)
      const userUnitIds = ownerships.map(o => o.unitId)

      if (userUnitIds.length === 0) {
        return ctx.ok({ data: [] })
      }

      const allReceipts: TCondominiumReceipt[] = []
      for (const uid of userUnitIds) {
        const unitReceipts = await this.receiptsRepository.getByUnitId(uid)
        allReceipts.push(...unitReceipts)
      }
      return ctx.ok({ data: allReceipts })
    }

    if (unitId) {
      const receipts = await this.receiptsRepository.getByUnitId(unitId)
      return ctx.ok({ data: receipts })
    }

    if (periodYear && periodMonth) {
      const receipts = await this.receiptsRepository.getByCondominiumAndPeriod(
        condominiumId,
        periodYear,
        periodMonth
      )
      return ctx.ok({ data: receipts })
    }

    const receipts = await this.receiptsRepository.getByCondominiumId(condominiumId)
    return ctx.ok({ data: receipts })
  }

  protected listPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<
      unknown,
      { page?: number; limit?: number; startDate?: string; endDate?: string; conceptId?: string }
    >(c)
    const userRole = c.get(USER_ROLE_PROP) as string

    // Get user's unit IDs (residents only see their own)
    const user = ctx.getAuthenticatedUser()
    const ownerships = await this.unitOwnershipsRepo.getByUserId(user.id)
    let userUnitIds = ownerships.map(o => o.unitId)

    // Admins/accountants can see all units in the condominium
    if (userRole !== ESystemRole.USER) {
      const condominiumId = c.get(CONDOMINIUM_ID_PROP)
      const allReceipts = await this.receiptsRepository.getByCondominiumId(condominiumId)
      userUnitIds = [...new Set(allReceipts.map(r => r.unitId))]
    }

    if (userUnitIds.length === 0) {
      return ctx.ok({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
    }

    const result = await this.receiptsRepository.listPaginatedByUnitIds(userUnitIds, {
      page: ctx.query.page,
      limit: ctx.query.limit,
      startDate: ctx.query.startDate,
      endDate: ctx.query.endDate,
      conceptId: ctx.query.conceptId,
    })

    return ctx.ok(result)
  }

  protected getByIdWithItems = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const receipt = await this.receiptsRepository.getById(ctx.params.id)
    if (!receipt) return ctx.notFound({ error: 'Recibo no encontrado' })

    const [quotas, currency] = await Promise.all([
      this.quotasRepo.getByUnitAndPeriod(receipt.unitId, receipt.periodYear, receipt.periodMonth),
      this.currenciesRepo.getById(receipt.currencyId),
    ])

    const currencySymbol = currency?.symbol ?? ''

    // Enrich each quota with its linked services
    const enrichedQuotas = await Promise.all(
      quotas.map(async quota => {
        const services = quota.paymentConcept
          ? await this.conceptServicesRepo.listByConceptId(quota.paymentConceptId)
          : []
        return {
          ...quota,
          services: services.map(s => ({
            id: s.id,
            serviceName: s.serviceName,
            providerType: s.providerType,
            amount: s.amount,
          })),
        }
      })
    )

    return ctx.ok({ data: { ...receipt, currencySymbol, quotas: enrichedQuotas } })
  }

  protected generateReceipt = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof GenerateReceiptBodySchema>>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const userId = c.get('userId') as string

    const result = await this.generateReceiptService.execute({
      condominiumId,
      unitId: ctx.body.unitId,
      periodYear: ctx.body.periodYear,
      periodMonth: ctx.body.periodMonth,
      currencyId: ctx.body.currencyId,
      budgetId: ctx.body.budgetId ?? null,
      generatedBy: userId,
    })

    if (!result.success) {
      if (result.code === 'CONFLICT') return ctx.conflict({ error: result.error })
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    return ctx.created({ data: result.data })
  }

  protected bulkGenerate = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof BulkGenerateBodySchema>>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const userId = c.get('userId') as string

    const result = await this.bulkGenerateService.execute({
      condominiumId,
      periodYear: ctx.body.periodYear,
      periodMonth: ctx.body.periodMonth,
      currencyId: ctx.body.currencyId,
      budgetId: ctx.body.budgetId ?? null,
      generatedBy: userId,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    return ctx.ok({ data: result.data })
  }

  protected downloadPdf = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    const result = await this.receiptPdfService.execute(ctx.params.id)
    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    const { data, filename, contentType } = result.data
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(data.byteLength),
      },
    })
  }

  private static readonly MONTH_NAMES = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  protected sendReceipt = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const receipt = await this.receiptsRepository.getById(ctx.params.id)
    if (!receipt) return ctx.notFound({ error: 'Recibo no encontrado' })

    if (receipt.status === 'voided') {
      return ctx.badRequest({ error: 'No se puede enviar un recibo anulado' })
    }

    // Get unit owners to email
    const ownerships = await this.unitOwnershipsRepo.getByUnitId(receipt.unitId)
    const ownerEmails = ownerships
      .filter(
        (o: Record<string, unknown>) =>
          (o.user as Record<string, unknown> | undefined)?.email &&
          (o.ownershipType === 'owner' || o.ownershipType === 'co-owner')
      )
      .map((o: Record<string, unknown>) => {
        const user = o.user as Record<string, unknown>
        return {
          email: user.email as string,
          name: ((user.displayName as string) ?? (user.email as string)) as string,
        }
      })

    if (ownerEmails.length === 0) {
      return ctx.badRequest({ error: 'No hay propietarios con email para esta unidad' })
    }

    // Get condominium name, currency, and quotas for email
    const [condominium, currency, receiptQuotas] = await Promise.all([
      this.condominiumsRepo.getById(receipt.condominiumId),
      this.currenciesRepo.getById(receipt.currencyId),
      this.quotasRepo.getByUnitAndPeriod(receipt.unitId, receipt.periodYear, receipt.periodMonth),
    ])
    const currencySymbol = String(currency?.symbol ?? '')
    const periodLabel = `${ReceiptsController.MONTH_NAMES[receipt.periodMonth - 1]} ${receipt.periodYear}`

    // Build breakdown items (concept + services) for email — matches web view & PDF
    const breakdown: Array<{ label: string; amount: string; sub?: boolean }> = []
    for (const q of receiptQuotas) {
      const conceptName = (q as Record<string, unknown>).paymentConcept
        ? ((q as Record<string, unknown>).paymentConcept as { name: string }).name
        : 'Cuota'
      breakdown.push({ label: conceptName, amount: q.baseAmount })

      // Fetch linked services
      if ((q as Record<string, unknown>).paymentConceptId) {
        const services = await this.conceptServicesRepo.listByConceptId(
          (q as Record<string, unknown>).paymentConceptId as string
        )
        for (const svc of services) {
          breakdown.push({ label: svc.serviceName, amount: String(svc.amount), sub: true })
        }
      }
    }

    // Build amounts summary for email — matches web view & PDF
    const amounts = {
      ordinary: receipt.ordinaryAmount,
      extraordinary: receipt.extraordinaryAmount,
      reserveFund: receipt.reserveFundAmount,
      interest: receipt.interestAmount,
      fines: receipt.finesAmount,
      previousBalance: receipt.previousBalance,
    }

    // Send to each owner
    let sent = 0
    for (const { email, name } of ownerEmails) {
      const result = await this.sendReceiptEmailService.execute({
        to: email,
        recipientName: name,
        condominiumName: condominium?.name ?? '',
        receiptNumber: receipt.receiptNumber,
        periodLabel,
        totalAmount: receipt.totalAmount,
        currencySymbol,
        breakdown,
        amounts,
      })

      if (result.success) {
        sent++
      } else {
        logger.warn(
          { email, receiptId: receipt.id, error: result.error },
          'Failed to send receipt email'
        )
      }
    }

    // Update receipt status to 'sent' if not already
    if (receipt.status === 'generated' && sent > 0) {
      await this.receiptsRepository.update(receipt.id, {
        status: 'sent',
        sentAt: new Date(),
      } as TCondominiumReceiptUpdate)
    }

    return ctx.ok({ data: { sent, total: ownerEmails.length } })
  }

  protected voidReceipt = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const receipt = await this.receiptsRepository.getById(ctx.params.id)
    if (!receipt) return ctx.notFound({ error: 'Recibo no encontrado' })

    if (receipt.status === 'voided') {
      return ctx.badRequest({ error: 'El recibo ya está anulado' })
    }

    const updated = await this.receiptsRepository.update(ctx.params.id, {
      status: 'voided',
      voidedAt: new Date(),
    } as TCondominiumReceiptUpdate)

    return ctx.ok({ data: updated })
  }
}
