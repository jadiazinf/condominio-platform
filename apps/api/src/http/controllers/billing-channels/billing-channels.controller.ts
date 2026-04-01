import type { Context } from 'hono'
import { z } from 'zod'
import { ESystemRole } from '@packages/domain'
import type {
  BillingChannelsRepository,
  ChargeTypesRepository,
  BillingChannelBankAccountsRepository,
  UnitsRepository,
  CondominiumsRepository,
  BillingReceiptsRepository,
  ChargesRepository,
} from '@database/repositories'
import type { UnitLedgerRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { GenerateChannelPeriodService } from '@services/billing-generation/generate-channel-period.service'
import { PreviewGenerationService } from '@services/billing-generation/preview-generation.service'
import { AppendLedgerEntryService } from '@services/billing-ledger/append-ledger-entry.service'

// ─── Schemas ──────────────────────────────────────────────────────────────

const CreateChannelSchema = z.object({
  condominiumId: z.string().uuid(),
  buildingId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  channelType: z.enum(['receipt', 'standalone']),
  currencyId: z.string().uuid(),
  managedBy: z.string().nullable().optional(),
  distributionMethod: z.enum(['by_aliquot', 'equal_split', 'fixed_per_unit']).default('by_aliquot'),
  frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual', 'one_time']).default('monthly'),
  generationStrategy: z.enum(['auto', 'manual']).default('manual'),
  generationDay: z.number().int().min(1).max(28).default(1),
  dueDay: z.number().int().min(1).max(28).default(15),
  latePaymentType: z.enum(['percentage', 'fixed', 'none']).default('none'),
  latePaymentValue: z.string().nullable().optional(),
  gracePeriodDays: z.number().int().min(0).default(0),
  earlyPaymentType: z.enum(['percentage', 'fixed', 'none']).default('none'),
  earlyPaymentValue: z.string().nullable().optional(),
  earlyPaymentDaysBefore: z.number().int().min(0).default(0),
  interestType: z.enum(['simple', 'compound', 'fixed_amount', 'none']).default('none'),
  interestRate: z.string().nullable().optional(),
  interestGracePeriodDays: z.number().int().min(0).default(0),
  maxInterestCapType: z.enum(['percentage_of_principal', 'fixed', 'none']).default('none'),
  maxInterestCapValue: z.string().nullable().optional(),
  allocationStrategy: z.enum(['fifo', 'designated', 'fifo_interest_first']).default('fifo'),
  assemblyReference: z.string().nullable().optional(),
  effectiveFrom: z.string(),
  effectiveUntil: z.string().nullable().optional(),
  chargeTypes: z.array(z.object({
    name: z.string().min(1).max(200),
    category: z.string(),
    isRecurring: z.boolean().default(true),
    defaultAmount: z.string().nullable().optional(),
    sortOrder: z.number().int().default(0),
  })).min(1),
  bankAccountIds: z.array(z.string().uuid()).min(1),
})

const GenerateSchema = z.object({
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  chargeAmounts: z.array(z.object({
    chargeTypeId: z.string().uuid(),
    amount: z.string(),
    description: z.string().optional(),
    expenseId: z.string().uuid().optional(),
  })).min(1),
  budgetId: z.string().uuid().optional(),
})

const PreviewSchema = z.object({
  chargeAmounts: z.array(z.object({
    chargeTypeId: z.string().uuid(),
    amount: z.string(),
  })).min(1),
})

const CondominiumQuerySchema = z.object({
  condominiumId: z.string().uuid(),
})

// ─── Controller ──────────────────────────────────────────────────────────

export class BillingChannelsController extends BaseController<any, any, any> {
  private generateService: GenerateChannelPeriodService
  private previewService: PreviewGenerationService

  constructor(
    private billingChannelsRepo: BillingChannelsRepository,
    private chargeTypesRepo: ChargeTypesRepository,
    private bankAccountsRepo: BillingChannelBankAccountsRepository,
    private receiptsRepo: BillingReceiptsRepository,
    private chargesRepo: ChargesRepository,
    private ledgerRepo: UnitLedgerRepository,
    private unitsRepo: UnitsRepository,
    private condominiumsRepo: CondominiumsRepository,
  ) {
    super(billingChannelsRepo)

    const appendLedgerService = new AppendLedgerEntryService(ledgerRepo)

    this.generateService = new GenerateChannelPeriodService(
      billingChannelsRepo, unitsRepo as any, chargeTypesRepo,
      receiptsRepo, chargesRepo, ledgerRepo,
      appendLedgerService, condominiumsRepo as any,
    )

    this.previewService = new PreviewGenerationService(
      billingChannelsRepo, unitsRepo as any, chargeTypesRepo,
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listByCondominium,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), queryValidator(CondominiumQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.createChannel,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), bodyValidator(CreateChannelSchema)],
      },
      {
        method: 'post',
        path: '/:id/generate/preview',
        handler: this.previewGeneration,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema), bodyValidator(PreviewSchema)],
      },
      {
        method: 'post',
        path: '/:id/generate',
        handler: this.generate,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema), bodyValidator(GenerateSchema)],
      },
      {
        method: 'get',
        path: '/:id/charge-types',
        handler: this.listChargeTypes,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(IdParamSchema)],
      },
    ]
  }

  private listByCondominium = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, { condominiumId: string }>(c)
    const channels = await this.billingChannelsRepo.listByCondominium(ctx.query.condominiumId)
    return ctx.ok({ data: channels })
  }

  private createChannel = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof CreateChannelSchema>>(c)
    const body = ctx.body
    const userId = c.get('userId') as string

    // Create channel
    const channel = await this.billingChannelsRepo.create({
      ...body,
      chargeTypes: undefined,
      bankAccountIds: undefined,
      isActive: true,
      createdBy: userId,
    } as any)

    // Create charge types
    for (const ct of body.chargeTypes) {
      await this.chargeTypesRepo.create({
        billingChannelId: channel.id,
        name: ct.name,
        category: ct.category as any,
        isAutoGenerated: false,
        isRecurring: ct.isRecurring,
        defaultAmount: ct.defaultAmount ?? null,
        sortOrder: ct.sortOrder,
        isActive: true,
      } as any)
    }

    // Auto-generated charge types
    for (const auto of [
      { name: 'Interés por mora', category: 'interest', sort: 997 },
      { name: 'Recargo por pago tardío', category: 'late_fee', sort: 998 },
      { name: 'Descuento por pronto pago', category: 'discount', sort: 999 },
    ]) {
      await this.chargeTypesRepo.create({
        billingChannelId: channel.id,
        name: auto.name,
        category: auto.category as any,
        isAutoGenerated: true,
        isRecurring: false,
        defaultAmount: null,
        sortOrder: auto.sort,
        isActive: true,
      } as any)
    }

    // Link bank accounts
    for (const baId of body.bankAccountIds) {
      await this.bankAccountsRepo.create({
        billingChannelId: channel.id,
        bankAccountId: baId,
        isActive: true,
        assignedBy: userId,
      } as any)
    }

    return ctx.created({ data: channel })
  }

  private listChargeTypes = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const types = await this.chargeTypesRepo.listByChannel(ctx.params.id)
    return ctx.ok({ data: types })
  }

  private previewGeneration = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof PreviewSchema>, unknown, { id: string }>(c)
    const result = await this.previewService.execute({
      channelId: ctx.params.id,
      chargeAmounts: ctx.body.chargeAmounts,
    })

    if (!result.success) return ctx.badRequest({ error: result.error })
    return ctx.ok({ data: result.data })
  }

  private generate = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof GenerateSchema>, unknown, { id: string }>(c)
    const result = await this.generateService.execute({
      channelId: ctx.params.id,
      periodYear: ctx.body.periodYear,
      periodMonth: ctx.body.periodMonth,
      chargeAmounts: ctx.body.chargeAmounts,
      budgetId: ctx.body.budgetId,
      createdBy: c.get('userId') as string,
    })

    if (!result.success) {
      if (result.code === 'CONFLICT') return ctx.conflict({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }
    return ctx.created({ data: result.data })
  }
}
