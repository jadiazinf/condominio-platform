import { and, eq, desc, gte, lte, sql } from 'drizzle-orm'
import type { TExchangeRate, TExchangeRateCreate, TExchangeRateUpdate, TPaginatedResponse } from '@packages/domain'
import { exchangeRates } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TExchangeRateRecord = typeof exchangeRates.$inferSelect

/**
 * Repository for managing exchange rate entities.
 * Uses soft delete via isActive flag.
 */
export class ExchangeRatesRepository
  extends BaseRepository<
    typeof exchangeRates,
    TExchangeRate,
    TExchangeRateCreate,
    TExchangeRateUpdate
  >
{
  constructor(db: TDrizzleClient) {
    super(db, exchangeRates)
  }

  protected mapToEntity(record: unknown): TExchangeRate {
    const r = record as TExchangeRateRecord
    return {
      id: r.id,
      fromCurrencyId: r.fromCurrencyId,
      toCurrencyId: r.toCurrencyId,
      rate: r.rate,
      effectiveDate: r.effectiveDate,
      source: r.source,
      isActive: r.isActive ?? true,
      createdBy: r.createdBy,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TExchangeRateCreate): Record<string, unknown> {
    return {
      fromCurrencyId: dto.fromCurrencyId,
      toCurrencyId: dto.toCurrencyId,
      rate: dto.rate,
      effectiveDate: dto.effectiveDate,
      source: dto.source,
      isActive: dto.isActive ?? true,
      createdBy: dto.createdBy,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TExchangeRateUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.fromCurrencyId !== undefined) values.fromCurrencyId = dto.fromCurrencyId
    if (dto.toCurrencyId !== undefined) values.toCurrencyId = dto.toCurrencyId
    if (dto.rate !== undefined) values.rate = dto.rate
    if (dto.effectiveDate !== undefined) values.effectiveDate = dto.effectiveDate
    if (dto.source !== undefined) values.source = dto.source
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
  }

  /**
   * Gets the latest active exchange rate between two currencies.
   */
  async getLatestRate(fromCurrencyId: string, toCurrencyId: string): Promise<TExchangeRate | null> {
    const results = await this.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrencyId, fromCurrencyId),
          eq(exchangeRates.toCurrencyId, toCurrencyId),
          eq(exchangeRates.isActive, true)
        )
      )
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Gets active exchange rates for a specific date.
   */
  async getByDate(effectiveDate: string): Promise<TExchangeRate[]> {
    const results = await this.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.effectiveDate, effectiveDate),
          eq(exchangeRates.isActive, true)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Gets the latest active exchange rate for each unique currency pair.
   */
  async getLatestRates(): Promise<TExchangeRate[]> {
    const subquery = this.db
      .select({
        fromCurrencyId: exchangeRates.fromCurrencyId,
        toCurrencyId: exchangeRates.toCurrencyId,
        maxDate: sql<string>`max(${exchangeRates.effectiveDate})`.as('max_date'),
      })
      .from(exchangeRates)
      .where(eq(exchangeRates.isActive, true))
      .groupBy(exchangeRates.fromCurrencyId, exchangeRates.toCurrencyId)
      .as('latest')

    const results = await this.db
      .select({ er: exchangeRates })
      .from(exchangeRates)
      .innerJoin(
        subquery,
        and(
          eq(exchangeRates.fromCurrencyId, subquery.fromCurrencyId),
          eq(exchangeRates.toCurrencyId, subquery.toCurrencyId),
          eq(exchangeRates.effectiveDate, subquery.maxDate)
        )
      )
      .where(eq(exchangeRates.isActive, true))
      .orderBy(desc(exchangeRates.effectiveDate))

    return results.map(r => this.mapToEntity(r.er))
  }

  /**
   * Gets the latest active exchange rates effective on or before a given date.
   * Returns one rate per currency pair (the most recent effectiveDate <= date).
   */
  async getEffectiveRatesByDate(date: string): Promise<TExchangeRate[]> {
    const subquery = this.db
      .select({
        fromCurrencyId: exchangeRates.fromCurrencyId,
        toCurrencyId: exchangeRates.toCurrencyId,
        maxDate: sql<string>`max(${exchangeRates.effectiveDate})`.as('max_date'),
      })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.isActive, true),
          lte(exchangeRates.effectiveDate, date)
        )
      )
      .groupBy(exchangeRates.fromCurrencyId, exchangeRates.toCurrencyId)
      .as('effective')

    const results = await this.db
      .select({ er: exchangeRates })
      .from(exchangeRates)
      .innerJoin(
        subquery,
        and(
          eq(exchangeRates.fromCurrencyId, subquery.fromCurrencyId),
          eq(exchangeRates.toCurrencyId, subquery.toCurrencyId),
          eq(exchangeRates.effectiveDate, subquery.maxDate)
        )
      )
      .where(eq(exchangeRates.isActive, true))
      .orderBy(desc(exchangeRates.effectiveDate))

    return results.map(r => this.mapToEntity(r.er))
  }

  /**
   * Gets all exchange rates with pagination and filters.
   */
  async getAllPaginated(query: IExchangeRatesQuery): Promise<TPaginatedResponse<TExchangeRate>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []
    if (query.fromCurrencyId) conditions.push(eq(exchangeRates.fromCurrencyId, query.fromCurrencyId))
    if (query.toCurrencyId) conditions.push(eq(exchangeRates.toCurrencyId, query.toCurrencyId))
    if (query.dateFrom) conditions.push(gte(exchangeRates.effectiveDate, query.dateFrom))
    if (query.dateTo) conditions.push(lte(exchangeRates.effectiveDate, query.dateTo))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(exchangeRates)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    const results = await this.db
      .select()
      .from(exchangeRates)
      .where(whereClause)
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(limit)
      .offset(offset)

    const data = results.map(record => this.mapToEntity(record))
    const totalPages = Math.ceil(total / limit)

    return {
      data,
      pagination: { page, limit, total, totalPages },
    }
  }
}

export interface IExchangeRatesQuery {
  page?: number
  limit?: number
  fromCurrencyId?: string
  toCurrencyId?: string
  dateFrom?: string
  dateTo?: string
}
