import type { Context } from 'hono'
import { z } from 'zod'
import { ESystemRole } from '@packages/domain'
import type { ChargesRepository, ChargeTypesRepository } from '@database/repositories'
import type { UnitLedgerRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { CreateChargeWithLedgerEntryService } from '@services/billing-ledger/create-charge-with-ledger-entry.service'
import { AppendLedgerEntryService } from '@services/billing-ledger/append-ledger-entry.service'

// ─── Schemas ──────────────────────────────────────────────────────────

const ChargesQuerySchema = z.object({
  unitId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  periodYear: z.coerce.number().int().optional(),
  periodMonth: z.coerce.number().int().optional(),
})

const CreditNoteSchema = z.object({
  amount: z.string(),
  reason: z.string().min(10),
  sourceChargeId: z.string().uuid().optional(),
})

const DebitNoteSchema = z.object({
  amount: z.string(),
  reason: z.string().min(10),
})

// ─── Controller ──────────────────────────────────────────────────────────

export class ChargesController extends BaseController<any, any, any> {
  private createChargeService: CreateChargeWithLedgerEntryService

  constructor(
    private chargesRepo: ChargesRepository,
    private chargeTypesRepo: ChargeTypesRepository,
    private ledgerRepo: UnitLedgerRepository,
  ) {
    super(chargesRepo)
    const appendService = new AppendLedgerEntryService(ledgerRepo)
    this.createChargeService = new CreateChargeWithLedgerEntryService(chargesRepo, appendService)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listCharges,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), queryValidator(ChargesQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/cancel',
        handler: this.cancelCharge,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/exonerate',
        handler: this.exonerateCharge,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/credit-note',
        handler: this.issueCreditNote,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema), bodyValidator(CreditNoteSchema)],
      },
      {
        method: 'post',
        path: '/:id/debit-note',
        handler: this.issueDebitNote,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema), bodyValidator(DebitNoteSchema)],
      },
    ]
  }

  private listCharges = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, z.infer<typeof ChargesQuerySchema>>(c)
    const { unitId, channelId, periodYear, periodMonth } = ctx.query

    if (unitId && channelId && periodYear && periodMonth) {
      const charges = await this.chargesRepo.findByUnitAndPeriod(unitId, channelId, periodYear, periodMonth)
      return ctx.ok({ data: charges })
    }

    if (unitId && channelId) {
      const charges = await this.chargesRepo.findPendingByUnitAndChannel(unitId, channelId)
      return ctx.ok({ data: charges })
    }

    const all = await this.chargesRepo.listAll(true)
    return ctx.ok({ data: all })
  }

  private cancelCharge = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const charge = await this.chargesRepo.update(ctx.params.id, { status: 'cancelled', balance: '0' })
    if (!charge) return ctx.notFound({ error: 'Cargo no encontrado' })
    return ctx.ok({ data: charge })
  }

  private exonerateCharge = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const charge = await this.chargesRepo.update(ctx.params.id, { status: 'exonerated', balance: '0' })
    if (!charge) return ctx.notFound({ error: 'Cargo no encontrado' })
    return ctx.ok({ data: charge })
  }

  private issueCreditNote = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof CreditNoteSchema>, unknown, { id: string }>(c)
    const charge = await this.chargesRepo.getById(ctx.params.id, true)
    if (!charge) return ctx.notFound({ error: 'Cargo no encontrado' })

    const creditNoteType = await this.chargeTypesRepo.findAutoGenerated(charge.billingChannelId, 'credit_note')
    if (!creditNoteType) {
      // Create ad-hoc — fallback
      return ctx.badRequest({ error: 'No se encontró tipo de cargo para nota de crédito' })
    }

    const result = await this.createChargeService.execute({
      billingChannelId: charge.billingChannelId,
      chargeTypeId: creditNoteType.id,
      unitId: charge.unitId,
      periodYear: charge.periodYear,
      periodMonth: charge.periodMonth,
      description: `Nota de crédito: ${ctx.body.reason}`,
      amount: ctx.body.amount,
      currencyId: charge.currencyId,
      isCredit: true,
      sourceChargeId: ctx.body.sourceChargeId ?? charge.id,
      entryDate: new Date().toISOString().split('T')[0]!,
      referenceType: 'credit_note',
      createdBy: c.get('userId') as string,
    })

    if (!result.success) return ctx.badRequest({ error: result.error })
    return ctx.created({ data: result.data })
  }

  private issueDebitNote = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof DebitNoteSchema>, unknown, { id: string }>(c)
    const charge = await this.chargesRepo.getById(ctx.params.id, true)
    if (!charge) return ctx.notFound({ error: 'Cargo no encontrado' })

    const debitNoteType = await this.chargeTypesRepo.findAutoGenerated(charge.billingChannelId, 'debit_note')
    if (!debitNoteType) {
      return ctx.badRequest({ error: 'No se encontró tipo de cargo para nota de débito' })
    }

    const result = await this.createChargeService.execute({
      billingChannelId: charge.billingChannelId,
      chargeTypeId: debitNoteType.id,
      unitId: charge.unitId,
      periodYear: charge.periodYear,
      periodMonth: charge.periodMonth,
      description: `Nota de débito: ${ctx.body.reason}`,
      amount: ctx.body.amount,
      currencyId: charge.currencyId,
      isCredit: false,
      sourceChargeId: charge.id,
      entryDate: new Date().toISOString().split('T')[0]!,
      referenceType: 'debit_note',
      createdBy: c.get('userId') as string,
    })

    if (!result.success) return ctx.badRequest({ error: result.error })
    return ctx.created({ data: result.data })
  }
}
