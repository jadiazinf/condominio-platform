import type { Context } from 'hono'
import { z } from 'zod'
import { ESystemRole } from '@packages/domain'
import type { ChargesRepository } from '@database/repositories'
import type { UnitLedgerRepository } from '@database/repositories'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { createRouter } from '../create-router'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { HttpContext } from '../../context'
import { GetAccountStatementService } from '@services/billing-ledger/get-account-statement.service'
import { GetUnitBalanceService } from '@services/billing-ledger/get-unit-balance.service'

// ─── Schemas ──────────────────────────────────────────────────────────

const StatementQuerySchema = z.object({
  condominiumId: z.string().uuid(),
  from: z.string(),
  to: z.string(),
})

const BalanceQuerySchema = z.object({
  condominiumId: z.string().uuid(),
})

// ─── Controller ──────────────────────────────────────────────────────────

export class BillingLedgerController {
  private statementService: GetAccountStatementService
  private balanceService: GetUnitBalanceService

  constructor(
    private ledgerRepo: UnitLedgerRepository,
    private chargesRepo: ChargesRepository,
  ) {
    this.statementService = new GetAccountStatementService(ledgerRepo, chargesRepo)
    this.balanceService = new GetUnitBalanceService(ledgerRepo)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/:id/statement',
        handler: this.getStatement,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema), queryValidator(StatementQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id/balance',
        handler: this.getBalance,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema), queryValidator(BalanceQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id/balance-summary',
        handler: this.getBalanceSummary,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id/statement/csv',
        handler: this.exportStatementCsv,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema), queryValidator(StatementQuerySchema)],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  private getStatement = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, z.infer<typeof StatementQuerySchema>, { id: string }>(c)

    const result = await this.statementService.execute({
      unitId: ctx.params.id,
      condominiumId: ctx.query.condominiumId,
      fromDate: ctx.query.from,
      toDate: ctx.query.to,
    })

    if (!result.success) return ctx.badRequest({ error: result.error })
    return ctx.ok({ data: result.data })
  }

  private getBalance = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, z.infer<typeof BalanceQuerySchema>, { id: string }>(c)

    const result = await this.balanceService.execute({
      unitId: ctx.params.id,
      condominiumId: ctx.query.condominiumId,
    })

    if (!result.success) return ctx.badRequest({ error: result.error })
    return ctx.ok({ data: result.data })
  }

  private exportStatementCsv = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, z.infer<typeof StatementQuerySchema>, { id: string }>(c)

    const result = await this.statementService.execute({
      unitId: ctx.params.id,
      condominiumId: ctx.query.condominiumId,
      fromDate: ctx.query.from,
      toDate: ctx.query.to,
    })

    if (!result.success) return ctx.badRequest({ error: result.error })

    const { entries } = result.data
    const header = 'Fecha,Descripción,Cargo,Abono,Saldo'
    const rows = entries.map((e: any) =>
      `${e.date},"${(e.description ?? '').replace(/"/g, '""')}",${e.debit ?? ''},${e.credit ?? ''},${e.balance}`
    )
    const csv = [header, ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="estado-cuenta-${ctx.params.id}.csv"`,
      },
    })
  }

  private getBalanceSummary = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, { id: string }>(c)
    // TODO: iterate all condominiums for this unit and get balance per condominium
    return ctx.ok({ data: { unitId: ctx.params.id, condominiums: [] } })
  }
}
