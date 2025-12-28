import { and, eq, desc } from 'drizzle-orm'
import type { TExchangeRate, TExchangeRateCreate, TExchangeRateUpdate } from '@packages/domain'
import { exchangeRates } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TExchangeRateRecord = typeof exchangeRates.$inferSelect

/**
 * Repository for managing exchange rate entities.
 * Uses hard delete since exchange rates don't have isActive flag.
 */
export class ExchangeRatesRepository
  extends BaseRepository<
    typeof exchangeRates,
    TExchangeRate,
    TExchangeRateCreate,
    TExchangeRateUpdate
  >
  implements IRepositoryWithHardDelete<TExchangeRate, TExchangeRateCreate, TExchangeRateUpdate>
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
      createdBy: r.createdBy,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TExchangeRateCreate): Record<string, unknown> {
    return {
      fromCurrencyId: dto.fromCurrencyId,
      toCurrencyId: dto.toCurrencyId,
      rate: dto.rate,
      effectiveDate: dto.effectiveDate,
      source: dto.source,
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
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
  }

  /**
   * Override listAll since exchange rates don't have isActive.
   */
  override async listAll(): Promise<TExchangeRate[]> {
    const results = await this.db.select().from(exchangeRates)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Gets the latest exchange rate between two currencies.
   */
  async getLatestRate(fromCurrencyId: string, toCurrencyId: string): Promise<TExchangeRate | null> {
    const results = await this.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrencyId, fromCurrencyId),
          eq(exchangeRates.toCurrencyId, toCurrencyId)
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
   * Gets exchange rates for a specific date.
   */
  async getByDate(effectiveDate: string): Promise<TExchangeRate[]> {
    const results = await this.db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.effectiveDate, effectiveDate))

    return results.map(record => this.mapToEntity(record))
  }
}
