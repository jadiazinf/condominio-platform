import type { Context } from 'hono'
import { z } from 'zod'
import { ESystemRole } from '@packages/domain'
import type {
  BankStatementImportsRepository,
  BankStatementEntriesRepository,
  BankReconciliationsRepository,
  BankStatementMatchesRepository,
  PaymentsRepository,
  GatewayTransactionsRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { ImportBankStatementService } from '@services/bank-reconciliation/import-bank-statement.service'
import { AutoMatchPaymentsService } from '@services/bank-reconciliation/auto-match-payments.service'
import { ManualMatchService } from '@services/bank-reconciliation/manual-match.service'
import { UnmatchEntryService } from '@services/bank-reconciliation/unmatch-entry.service'
import { IgnoreEntryService } from '@services/bank-reconciliation/ignore-entry.service'
import { ReconcileService } from '@services/bank-reconciliation/reconcile.service'
import { GetReconciliationSummaryService } from '@services/bank-reconciliation/get-reconciliation-summary.service'

// ─── Validation Schemas ──────────────────────────────────────────────────────

const ImportBodySchema = z.object({
  bankAccountId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  csvContent: z.string().min(1),
  columnMapping: z.object({
    transactionDate: z.string().min(1),
    reference: z.string().min(1),
    description: z.string().min(1),
    amount: z.string().min(1),
    entryType: z.string().optional(),
    valueDate: z.string().optional(),
    balance: z.string().optional(),
  }),
})

const ImportsQuerySchema = z.object({
  bankAccountId: z.string().uuid(),
})

const ManualMatchBodySchema = z.object({
  entryId: z.string().uuid(),
  paymentId: z.string().uuid(),
  notes: z.string().optional(),
})

const CreateReconciliationBodySchema = z.object({
  bankAccountId: z.string().uuid(),
  periodFrom: z.string().min(1),
  periodTo: z.string().min(1),
  notes: z.string().optional(),
})

// ─── Controller ──────────────────────────────────────────────────────────────

export class BankReconciliationController extends BaseController<never, never, never> {
  private readonly importService: ImportBankStatementService
  private readonly autoMatchService: AutoMatchPaymentsService
  private readonly manualMatchService: ManualMatchService
  private readonly unmatchService: UnmatchEntryService
  private readonly ignoreService: IgnoreEntryService
  private readonly reconcileService: ReconcileService
  private readonly summaryService: GetReconciliationSummaryService

  constructor(
    private readonly importsRepo: BankStatementImportsRepository,
    private readonly entriesRepo: BankStatementEntriesRepository,
    private readonly reconciliationsRepo: BankReconciliationsRepository,
    private readonly matchesRepo: BankStatementMatchesRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly gatewayTransactionsRepo: GatewayTransactionsRepository
  ) {
    super(importsRepo as never)

    this.importService = new ImportBankStatementService(importsRepo, entriesRepo)
    this.autoMatchService = new AutoMatchPaymentsService(
      entriesRepo,
      matchesRepo,
      paymentsRepo,
      gatewayTransactionsRepo
    )
    this.manualMatchService = new ManualMatchService(entriesRepo, matchesRepo, paymentsRepo)
    this.unmatchService = new UnmatchEntryService(entriesRepo, matchesRepo)
    this.ignoreService = new IgnoreEntryService(entriesRepo)
    this.reconcileService = new ReconcileService(reconciliationsRepo, entriesRepo, importsRepo)
    this.summaryService = new GetReconciliationSummaryService(
      reconciliationsRepo,
      entriesRepo,
      matchesRepo,
      importsRepo
    )
  }

  get routes(): TRouteDefinition[] {
    const auth = [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)]

    return [
      // Imports
      {
        method: 'post',
        path: '/import',
        handler: this.importStatement,
        middlewares: [...auth, bodyValidator(ImportBodySchema)],
      },
      {
        method: 'get',
        path: '/imports',
        handler: this.listImports,
        middlewares: [...auth, queryValidator(ImportsQuerySchema)],
      },
      {
        method: 'get',
        path: '/imports/:id/entries',
        handler: this.getImportEntries,
        middlewares: [...auth, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/imports/:id/auto-match',
        handler: this.autoMatch,
        middlewares: [...auth, paramsValidator(IdParamSchema)],
      },

      // Matching
      {
        method: 'post',
        path: '/match',
        handler: this.manualMatch,
        middlewares: [...auth, bodyValidator(ManualMatchBodySchema)],
      },
      {
        method: 'delete',
        path: '/match/:id',
        handler: this.unmatch,
        middlewares: [...auth, paramsValidator(IdParamSchema)],
      },

      // Entries
      {
        method: 'patch',
        path: '/entries/:id/ignore',
        handler: this.ignoreEntry,
        middlewares: [...auth, paramsValidator(IdParamSchema)],
      },

      // Reconciliations
      {
        method: 'post',
        path: '/reconciliations',
        handler: this.createReconciliation,
        middlewares: [...auth, bodyValidator(CreateReconciliationBodySchema)],
      },
      {
        method: 'get',
        path: '/reconciliations',
        handler: this.listReconciliations,
        middlewares: auth,
      },
      {
        method: 'get',
        path: '/reconciliations/:id',
        handler: this.getReconciliation,
        middlewares: [...auth, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/reconciliations/:id/complete',
        handler: this.completeReconciliation,
        middlewares: [...auth, paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─── Import Handlers ────────────────────────────────────────────────────────

  private importStatement = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof ImportBodySchema>>(c)
    const userId = c.get('userId') as string

    const result = await this.importService.execute({
      ...ctx.body,
      importedBy: userId,
    })

    if (!result.success) return ctx.badRequest({ error: result.error })
    return ctx.created({ data: result.data })
  }

  private listImports = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, z.infer<typeof ImportsQuerySchema>>(c)
    const imports = await this.importsRepo.getByBankAccountId(ctx.query.bankAccountId)
    return ctx.ok({ data: imports })
  }

  private getImportEntries = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const entries = await this.entriesRepo.getByImportId(ctx.params.id)
    return ctx.ok({ data: entries })
  }

  // ─── Auto Match Handler ─────────────────────────────────────────────────────

  private autoMatch = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const result = await this.autoMatchService.execute({ importId: ctx.params.id })

    if (!result.success) return ctx.badRequest({ error: result.error })
    return ctx.ok({ data: result.data })
  }

  // ─── Match Handlers ─────────────────────────────────────────────────────────

  private manualMatch = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof ManualMatchBodySchema>>(c)
    const userId = c.get('userId') as string

    const result = await this.manualMatchService.execute({
      ...ctx.body,
      matchedBy: userId,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      if (result.code === 'CONFLICT') return ctx.conflict({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }
    return ctx.created({ data: result.data })
  }

  private unmatch = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const result = await this.unmatchService.execute({ entryId: ctx.params.id })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }
    return ctx.ok({ data: result.data })
  }

  // ─── Entry Handlers ─────────────────────────────────────────────────────────

  private ignoreEntry = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const result = await this.ignoreService.execute({ entryId: ctx.params.id })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }
    return ctx.ok({ data: result.data })
  }

  // ─── Reconciliation Handlers ────────────────────────────────────────────────

  private createReconciliation = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof CreateReconciliationBodySchema>>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    const reconciliation = await this.reconciliationsRepo.create({
      bankAccountId: ctx.body.bankAccountId,
      condominiumId,
      periodFrom: new Date(ctx.body.periodFrom),
      periodTo: new Date(ctx.body.periodTo),
      notes: ctx.body.notes ?? null,
      metadata: null,
    })

    return ctx.created({ data: reconciliation })
  }

  private listReconciliations = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const reconciliations = await this.reconciliationsRepo.getByCondominiumId(condominiumId)
    return ctx.ok({ data: reconciliations })
  }

  private getReconciliation = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const result = await this.summaryService.execute({
      reconciliationId: ctx.params.id,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }
    return ctx.ok({ data: result.data })
  }

  private completeReconciliation = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const userId = c.get('userId') as string

    const result = await this.reconcileService.execute({
      reconciliationId: ctx.params.id,
      reconciledBy: userId,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      if (result.code === 'CONFLICT') return ctx.conflict({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }
    return ctx.ok({ data: result.data })
  }
}
