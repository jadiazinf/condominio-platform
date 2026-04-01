import type { Context } from 'hono'
import { z } from 'zod'
import { ESystemRole } from '@packages/domain'
import type {
  BillingReceiptsRepository,
  ChargesRepository,
} from '@database/repositories'
import type { UnitLedgerRepository, PaymentAllocationsV2Repository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { VoidReceiptService } from '@services/billing-payments/void-receipt.service'
import { AppendLedgerEntryService } from '@services/billing-ledger/append-ledger-entry.service'

// ─── Schemas ──────────────────────────────────────────────────────────

const ReceiptsQuerySchema = z.object({
  channelId: z.string().uuid().optional(),
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

  constructor(
    private receiptsRepo: BillingReceiptsRepository,
    private chargesRepo: ChargesRepository,
    private allocationsRepo: PaymentAllocationsV2Repository,
    private ledgerRepo: UnitLedgerRepository,
  ) {
    super(receiptsRepo)
    const appendService = new AppendLedgerEntryService(ledgerRepo)
    this.voidReceiptService = new VoidReceiptService(
      receiptsRepo, chargesRepo, allocationsRepo, appendService,
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
        method: 'post',
        path: '/:id/void',
        handler: this.voidReceipt,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema), bodyValidator(VoidReceiptSchema)],
      },
    ]
  }

  private listReceipts = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, z.infer<typeof ReceiptsQuerySchema>>(c)
    const { channelId, periodYear, periodMonth } = ctx.query

    if (channelId && periodYear && periodMonth) {
      const receipts = await this.receiptsRepo.findActiveByChannelAndPeriod(channelId, periodYear, periodMonth)
      return ctx.ok({ data: receipts })
    }

    const all = await this.receiptsRepo.listAll(true)
    return ctx.ok({ data: all })
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
