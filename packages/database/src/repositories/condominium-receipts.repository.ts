import { and, eq, desc, inArray, sql, type SQL } from 'drizzle-orm'
import type {
  TCondominiumReceipt,
  TCondominiumReceiptCreate,
  TCondominiumReceiptUpdate,
  TPaginatedResponse,
} from '@packages/domain'
import { condominiumReceipts, quotas, paymentConcepts, currencies } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TReceiptRecord = typeof condominiumReceipts.$inferSelect

export class CondominiumReceiptsRepository
  extends BaseRepository<
    typeof condominiumReceipts,
    TCondominiumReceipt,
    TCondominiumReceiptCreate,
    TCondominiumReceiptUpdate
  >
  implements
    IRepositoryWithHardDelete<
      TCondominiumReceipt,
      TCondominiumReceiptCreate,
      TCondominiumReceiptUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, condominiumReceipts)
  }

  protected mapToEntity(record: unknown): TCondominiumReceipt {
    const r = record as TReceiptRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      unitId: r.unitId,
      budgetId: r.budgetId,
      currencyId: r.currencyId,
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      receiptNumber: r.receiptNumber,
      status: (r.status ?? 'draft') as TCondominiumReceipt['status'],
      ordinaryAmount: r.ordinaryAmount,
      extraordinaryAmount: r.extraordinaryAmount,
      reserveFundAmount: r.reserveFundAmount,
      interestAmount: r.interestAmount,
      finesAmount: r.finesAmount,
      previousBalance: r.previousBalance,
      totalAmount: r.totalAmount,
      unitAliquot: r.unitAliquot,
      pdfUrl: r.pdfUrl,
      generatedAt: r.generatedAt,
      sentAt: r.sentAt,
      voidedAt: r.voidedAt,
      notes: r.notes,
      metadata: r.metadata as Record<string, unknown> | null,
      generatedBy: r.generatedBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  override async listAll(): Promise<TCondominiumReceipt[]> {
    const results = await this.db
      .select()
      .from(condominiumReceipts)
      .orderBy(desc(condominiumReceipts.createdAt))
    return results.map(record => this.mapToEntity(record))
  }

  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  async getByCondominiumId(condominiumId: string): Promise<TCondominiumReceipt[]> {
    const results = await this.db
      .select()
      .from(condominiumReceipts)
      .where(eq(condominiumReceipts.condominiumId, condominiumId))
      .orderBy(desc(condominiumReceipts.periodYear), desc(condominiumReceipts.periodMonth))

    return results.map(record => this.mapToEntity(record))
  }

  async getByUnitId(unitId: string): Promise<TCondominiumReceipt[]> {
    const results = await this.db
      .select()
      .from(condominiumReceipts)
      .where(eq(condominiumReceipts.unitId, unitId))
      .orderBy(desc(condominiumReceipts.periodYear), desc(condominiumReceipts.periodMonth))

    return results.map(record => this.mapToEntity(record))
  }

  async getByUnitAndPeriod(
    unitId: string,
    periodYear: number,
    periodMonth: number
  ): Promise<TCondominiumReceipt | null> {
    const results = await this.db
      .select()
      .from(condominiumReceipts)
      .where(
        and(
          eq(condominiumReceipts.unitId, unitId),
          eq(condominiumReceipts.periodYear, periodYear),
          eq(condominiumReceipts.periodMonth, periodMonth)
        )
      )
      .limit(1)

    return results[0] ? this.mapToEntity(results[0]) : null
  }

  async getByCondominiumAndPeriod(
    condominiumId: string,
    periodYear: number,
    periodMonth: number
  ): Promise<TCondominiumReceipt[]> {
    const results = await this.db
      .select()
      .from(condominiumReceipts)
      .where(
        and(
          eq(condominiumReceipts.condominiumId, condominiumId),
          eq(condominiumReceipts.periodYear, periodYear),
          eq(condominiumReceipts.periodMonth, periodMonth)
        )
      )
      .orderBy(desc(condominiumReceipts.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Paginated receipts for given unit IDs with optional filters.
   * Returns enriched data with concept names and currency symbol.
   */
  async listPaginatedByUnitIds(
    unitIds: string[],
    options: {
      page?: number
      limit?: number
      startDate?: string
      endDate?: string
      conceptId?: string
    } = {}
  ): Promise<
    TPaginatedResponse<
      TCondominiumReceipt & {
        conceptNames: string[]
        conceptTypes: string[]
        currencySymbol: string | null
      }
    >
  > {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    if (unitIds.length === 0) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } }
    }

    const conditions: SQL[] = [inArray(condominiumReceipts.unitId, unitIds)]

    if (options.startDate) {
      // Filter by period: startDate = YYYY-MM → periodYear >= year AND (periodYear > year OR periodMonth >= month)
      const [startYear, startMonth] = options.startDate.split('-').map(Number)
      if (startYear && startMonth) {
        conditions.push(
          sql`(${condominiumReceipts.periodYear} > ${startYear} OR (${condominiumReceipts.periodYear} = ${startYear} AND ${condominiumReceipts.periodMonth} >= ${startMonth}))`
        )
      }
    }
    if (options.endDate) {
      const [endYear, endMonth] = options.endDate.split('-').map(Number)
      if (endYear && endMonth) {
        conditions.push(
          sql`(${condominiumReceipts.periodYear} < ${endYear} OR (${condominiumReceipts.periodYear} = ${endYear} AND ${condominiumReceipts.periodMonth} <= ${endMonth}))`
        )
      }
    }

    // If conceptId filter: only receipts whose unit+period has a quota for that concept
    if (options.conceptId) {
      const unitIdsWithConcept = this.db
        .select({ unitId: quotas.unitId })
        .from(quotas)
        .where(eq(quotas.paymentConceptId, options.conceptId))
      conditions.push(inArray(condominiumReceipts.unitId, unitIdsWithConcept))
    }

    const whereClause = and(...conditions)

    // Count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(condominiumReceipts)
      .where(whereClause)
    const total = countResult[0]?.count ?? 0

    // Fetch receipts with currency symbol
    const results = await this.db
      .select({
        receipt: condominiumReceipts,
        currencySymbol: currencies.symbol,
      })
      .from(condominiumReceipts)
      .leftJoin(currencies, eq(condominiumReceipts.currencyId, currencies.id))
      .where(whereClause)
      .orderBy(desc(condominiumReceipts.periodYear), desc(condominiumReceipts.periodMonth))
      .limit(limit)
      .offset(offset)

    // For each receipt, get distinct concept names from its quotas
    const receiptIds = results.map(r => r.receipt.id)
    const conceptsByReceipt = new Map<string, { names: string[]; types: string[] }>()

    if (receiptIds.length > 0) {
      // Get quotas for these receipts' unit+period combinations
      for (const r of results) {
        const conceptResults = await this.db
          .select({ name: paymentConcepts.name, conceptType: paymentConcepts.conceptType })
          .from(quotas)
          .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
          .where(
            and(
              eq(quotas.unitId, r.receipt.unitId),
              eq(quotas.periodYear, r.receipt.periodYear),
              eq(quotas.periodMonth, r.receipt.periodMonth)
            )
          )
        conceptsByReceipt.set(r.receipt.id, {
          names: conceptResults.map(c => c.name).filter(Boolean) as string[],
          types: [...new Set(conceptResults.map(c => c.conceptType).filter(Boolean) as string[])],
        })
      }
    }

    const totalPages = Math.ceil(total / limit)

    const data = results.map(r => ({
      ...this.mapToEntity(r.receipt),
      conceptNames: conceptsByReceipt.get(r.receipt.id)?.names ?? [],
      conceptTypes: conceptsByReceipt.get(r.receipt.id)?.types ?? [],
      currencySymbol: r.currencySymbol,
    }))

    return { data, pagination: { page, limit, total, totalPages } }
  }
}
