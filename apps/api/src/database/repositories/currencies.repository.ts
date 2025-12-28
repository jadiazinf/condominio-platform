import { eq } from 'drizzle-orm'
import type { TCurrency, TCurrencyCreate, TCurrencyUpdate } from '@packages/domain'
import { currencies } from '@database/drizzle/schema'
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

  protected mapToInsertValues(dto: TCurrencyCreate): Record<string, unknown> {
    return {
      code: dto.code,
      name: dto.name,
      symbol: dto.symbol,
      isBaseCurrency: dto.isBaseCurrency,
      isActive: dto.isActive,
      decimals: dto.decimals,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TCurrencyUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.code !== undefined) values.code = dto.code
    if (dto.name !== undefined) values.name = dto.name
    if (dto.symbol !== undefined) values.symbol = dto.symbol
    if (dto.isBaseCurrency !== undefined) values.isBaseCurrency = dto.isBaseCurrency
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.decimals !== undefined) values.decimals = dto.decimals
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
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
}
