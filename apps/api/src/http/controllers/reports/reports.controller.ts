import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { queryValidator, getQuery } from '../../middlewares/utils/payload-validator'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { DatabaseService } from '@database/service'
import { QuotasRepository } from '@database/repositories/quotas.repository'
import { PaymentsRepository } from '@database/repositories/payments.repository'
import { UnitsRepository } from '@database/repositories/units.repository'
import { BuildingsRepository } from '@database/repositories/buildings.repository'
import { GenerateAccountStatementService } from '@services/reports/generate-account-statement.service'
import { GenerateDebtorsReportService } from '@services/reports/generate-debtors-report.service'

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const AccountStatementQuerySchema = z.object({
  unitId: z.string().uuid(),
  format: z.enum(['csv', 'pdf']).default('csv'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const DebtorsReportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

type TAccountStatementQuery = z.infer<typeof AccountStatementQuerySchema>
type TDebtorsReportQuery = z.infer<typeof DebtorsReportQuerySchema>

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reports controller for generating exportable reports (PDF/CSV).
 * Standalone controller (does not extend BaseController since it does not manage a CRUD resource).
 */
export class ReportsController {
  /**
   * Creates the Hono router with all report routes.
   */
  createRouter(): Hono {
    const router = new Hono()

    router.get(
      '/account-statement',
      authMiddleware,
      requireRole('ADMIN', 'ACCOUNTANT'),
      queryValidator(AccountStatementQuerySchema),
      this.getAccountStatement
    )

    router.get(
      '/debtors',
      authMiddleware,
      requireRole('ADMIN', 'ACCOUNTANT'),
      queryValidator(DebtorsReportQuerySchema),
      this.getDebtorsReport
    )

    return router
  }

  /**
   * GET /reports/account-statement?unitId=...&format=csv|pdf&startDate=...&endDate=...
   *
   * Generates an account statement for a specific unit containing quotas and payments.
   * Returns a downloadable file (CSV or PDF).
   */
  private getAccountStatement = async (c: Context): Promise<Response> => {
    const query = getQuery<TAccountStatementQuery>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    const db = DatabaseService.getInstance().getDb()
    const service = new GenerateAccountStatementService(
      new QuotasRepository(db),
      new PaymentsRepository(db),
      new UnitsRepository(db),
    )

    const result = await service.execute({
      unitId: query.unitId,
      format: query.format,
      startDate: query.startDate,
      endDate: query.endDate,
      generatedBy: user.displayName ?? user.email,
    })

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 404)
    }

    const { data, filename, contentType } = result.data
    const body = typeof data === 'string' ? new TextEncoder().encode(data) : data

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(body.byteLength),
      },
    })
  }

  /**
   * GET /reports/debtors?format=csv|pdf&asOfDate=...
   *
   * Generates a debtors report for the current condominium (from context) listing
   * all units with overdue quotas. Returns a downloadable file (CSV or PDF).
   * The condominiumId is read from Hono context (set by requireRole() middleware).
   */
  private getDebtorsReport = async (c: Context): Promise<Response> => {
    const query = getQuery<TDebtorsReportQuery>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    const db = DatabaseService.getInstance().getDb()
    const service = new GenerateDebtorsReportService(
      new QuotasRepository(db),
      new UnitsRepository(db),
      new BuildingsRepository(db),
    )

    const result = await service.execute({
      condominiumId,
      format: query.format,
      asOfDate: query.asOfDate,
      generatedBy: user.displayName ?? user.email,
    })

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 404)
    }

    const { data, filename, contentType } = result.data
    const body = typeof data === 'string' ? new TextEncoder().encode(data) : data

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(body.byteLength),
      },
    })
  }
}
