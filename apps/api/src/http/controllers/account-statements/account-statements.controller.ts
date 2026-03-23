import type { Context } from 'hono'
import { ESystemRole } from '@packages/domain'
import type {
  QuotasRepository,
  PaymentsRepository,
  PaymentApplicationsRepository,
  UnitsRepository,
  UnitOwnershipsRepository,
} from '@database/repositories'
import { HttpContext } from '../../context'
import { paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import { GetUnitAccountStatementService } from '@src/services/account-statements/get-unit-account-statement.service'
import { GetDelinquencyReportService } from '@src/services/account-statements/get-delinquency-report.service'
import { PaymentReminderService } from '@src/services/account-statements/payment-reminder.service'

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const UnitIdParamSchema = z.object({
  unitId: z.string().uuid(),
})

const StatementQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

const DelinquencyQuerySchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  buildingId: z.string().uuid().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Controller for account statements, delinquency reports, and payment reminders.
 *
 * Endpoints:
 * - GET /units/:unitId/statement?from=&to=    Unit account statement
 * - GET /delinquency?asOfDate=&buildingId=    Delinquency report
 */
export class AccountStatementsController {
  private readonly statementService: GetUnitAccountStatementService
  private readonly delinquencyService: GetDelinquencyReportService
  private readonly reminderService: PaymentReminderService

  constructor(
    private readonly deps: {
      quotasRepo: QuotasRepository
      paymentsRepo: PaymentsRepository
      applicationsRepo: PaymentApplicationsRepository
      unitsRepo: UnitsRepository
      unitOwnershipsRepo: UnitOwnershipsRepository
    }
  ) {
    this.statementService = new GetUnitAccountStatementService(
      deps.quotasRepo,
      deps.paymentsRepo,
      deps.applicationsRepo,
      deps.unitsRepo
    )

    this.delinquencyService = new GetDelinquencyReportService(deps.quotasRepo, deps.unitsRepo)

    this.reminderService = new PaymentReminderService(deps.quotasRepo, deps.unitOwnershipsRepo)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/units/:unitId/statement',
        handler: this.getStatement,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.USER, ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(UnitIdParamSchema),
          queryValidator(StatementQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/delinquency',
        handler: this.getDelinquency,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          queryValidator(DelinquencyQuerySchema),
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

  private getStatement = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, z.infer<typeof StatementQuerySchema>, { unitId: string }>(
      c
    )

    const result = await this.statementService.execute({
      unitId: ctx.params.unitId,
      from: ctx.query.from,
      to: ctx.query.to,
      asOfDate: ctx.query.asOfDate,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    return ctx.ok({ data: result.data })
  }

  private getDelinquency = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, z.infer<typeof DelinquencyQuerySchema>>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    if (!condominiumId) {
      return ctx.badRequest({ error: 'Condominium ID is required' })
    }

    const result = await this.delinquencyService.execute({
      condominiumId,
      asOfDate: ctx.query.asOfDate,
      buildingId: ctx.query.buildingId,
    })

    if (!result.success) {
      return ctx.badRequest({ error: result.error })
    }

    return ctx.ok({ data: result.data })
  }
}
