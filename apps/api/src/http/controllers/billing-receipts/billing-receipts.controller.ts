import type { Context } from 'hono'
import { z } from 'zod'
import { ESystemRole } from '@packages/domain'
import type {
  BillingReceiptsRepository,
  ChargesRepository,
  ChargeTypesRepository,
  UnitsRepository,
  BuildingsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
} from '@database/repositories'
import type { UnitLedgerRepository, PaymentAllocationsV2Repository, UnitOwnershipsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { VoidReceiptService } from '@services/billing-payments/void-receipt.service'
import { AppendLedgerEntryService } from '@services/billing-ledger/append-ledger-entry.service'
import { GenerateBillingReceiptPdfService } from '@services/billing-generation/generate-billing-receipt-pdf.service'
import { SendBillingReceiptEmailService } from '@services/billing-generation/send-billing-receipt-email.service'
import { SendReceiptEmailService } from '@services/email/send-receipt-email.service'

// ─── Schemas ──────────────────────────────────────────────────────────

const ReceiptsQuerySchema = z.object({
  condominiumId: z.string().uuid().optional(),
  periodYear: z.coerce.number().int().optional(),
  periodMonth: z.coerce.number().int().optional(),
})

const VoidReceiptSchema = z.object({
  voidReason: z.string().min(10),
  generateReplacement: z.boolean().default(false),
})

// ─── Controller ──────────────────────────────────────────────────────────

export class BillingReceiptsController extends BaseController<any, any, any> {
  private voidReceiptService: VoidReceiptService
  private pdfService: GenerateBillingReceiptPdfService
  private sendEmailService: SendBillingReceiptEmailService

  constructor(
    private receiptsRepo: BillingReceiptsRepository,
    private chargesRepo: ChargesRepository,
    private allocationsRepo: PaymentAllocationsV2Repository,
    private ledgerRepo: UnitLedgerRepository,
    private chargeTypesRepo: ChargeTypesRepository,
    private unitsRepo: UnitsRepository,
    private buildingsRepo: BuildingsRepository,
    private condominiumsRepo: CondominiumsRepository,
    private currenciesRepo: CurrenciesRepository,
    private unitOwnershipsRepo?: UnitOwnershipsRepository,
  ) {
    super(receiptsRepo)
    const appendService = new AppendLedgerEntryService(ledgerRepo)
    this.voidReceiptService = new VoidReceiptService(
      receiptsRepo, chargesRepo, allocationsRepo, appendService,
    )
    this.pdfService = new GenerateBillingReceiptPdfService(
      receiptsRepo, chargesRepo, chargeTypesRepo,
      unitsRepo, buildingsRepo, condominiumsRepo, currenciesRepo,
    )
    this.sendEmailService = new SendBillingReceiptEmailService(
      receiptsRepo, condominiumsRepo, unitsRepo,
      unitOwnershipsRepo as any, currenciesRepo,
      new SendReceiptEmailService(), this.pdfService,
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listReceipts,
        middlewares: [authMiddleware, queryValidator(ReceiptsQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id/pdf',
        handler: this.downloadPdf,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/send',
        handler: this.sendEmail,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/void',
        handler: this.voidReceipt,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema), bodyValidator(VoidReceiptSchema)],
      },
    ]
  }

  private listReceipts = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, z.infer<typeof ReceiptsQuerySchema>>(c)
    const { condominiumId, periodYear, periodMonth } = ctx.query

    if (condominiumId && periodYear && periodMonth) {
      const receipts = await this.receiptsRepo.findActiveByCondominiumAndPeriod(condominiumId, periodYear, periodMonth)
      return ctx.ok({ data: receipts })
    }

    const all = await this.receiptsRepo.listAll(true)
    return ctx.ok({ data: all })
  }

  private downloadPdf = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const result = await this.pdfService.execute(ctx.params.id)

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    return new Response(result.data.data, {
      headers: {
        'Content-Type': result.data.contentType,
        'Content-Disposition': `attachment; filename="${result.data.filename}"`,
      },
    })
  }

  private sendEmail = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const result = await this.sendEmailService.execute(ctx.params.id)

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    return ctx.ok({ data: result.data })
  }

  private voidReceipt = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof VoidReceiptSchema>, unknown, { id: string }>(c)

    const result = await this.voidReceiptService.execute({
      receiptId: ctx.params.id,
      voidReason: ctx.body.voidReason,
      createdBy: c.get('userId') as string,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      if (result.code === 'CONFLICT') return ctx.conflict({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    return ctx.ok({ data: result.data })
  }
}
