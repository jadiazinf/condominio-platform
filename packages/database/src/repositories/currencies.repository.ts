import { eq, ne, and } from 'drizzle-orm'
import type { TCurrency, TCurrencyCreate, TCurrencyUpdate } from '@packages/domain'
import { currencies } from '../drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TCurrencyRecord = typeof currencies.$inferSelect

/**
 * Repository for managing currency entities.
 * Implements soft delete pattern via isActive flag.
 */
export class CurrenciesRepository
  extends BaseRepository<typeof currencies, TCurrency, TCurrencyCreate, TCurrencyUpdate>
  implements IRepository<TCurrency, TCurrencyCreate, TCurrencyUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, currencies)
  }

  protected mapToEntity(record: unknown): TCurrency {
    const r = record as TCurrencyRecord
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      symbol: r.symbol,
      isBaseCurrency: r.isBaseCurrency ?? false,
      isActive: r.isActive ?? true,
      decimals: r.decimals ?? 2,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  /**
   * Retrieves a currency by its code.
   */
  async getByCode(code: string): Promise<TCurrency | null> {
    const results = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.code, code))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves the base currency.
   */
  async getBaseCurrency(): Promise<TCurrency | null> {
    const results = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.isBaseCurrency, true))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Sets a currency as the base currency, ensuring only one base currency exists.
   * Unsets any previously marked base currency.
   */
  async setBaseCurrency(id: string): Promise<TCurrency | null> {
    // Unset any existing base currency
    await this.db
      .update(currencies)
      .set({ isBaseCurrency: false, updatedAt: new Date() })
      .where(and(eq(currencies.isBaseCurrency, true), ne(currencies.id, id)))

    // Set the new base currency
    const results = await this.db
      .update(currencies)
      .set({ isBaseCurrency: true, updatedAt: new Date() })
      .where(eq(currencies.id, id))
      .returning()

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Override create to enforce only one base currency at a time.
   */
  override async create(dto: TCurrencyCreate): Promise<TCurrency> {
    if (dto.isBaseCurrency) {
      await this.db
        .update(currencies)
        .set({ isBaseCurrency: false, updatedAt: new Date() })
        .where(eq(currencies.isBaseCurrency, true))
    }
    return super.create(dto)
  }
}
