import { eq, and, ilike, type SQL } from 'drizzle-orm'
import type { TBank, TBankCreate, TBanksQuerySchema, TBankPaymentMethod } from '@packages/domain'
import { banks } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TBankRecord = typeof banks.$inferSelect

export class BanksRepository
  extends BaseRepository<typeof banks, TBank, TBankCreate, Partial<TBankCreate>>
  implements IRepository<TBank, TBankCreate, Partial<TBankCreate>>
{
  constructor(db: TDrizzleClient) {
    super(db, banks)
  }

  protected mapToEntity(record: unknown): TBank {
    const r = record as TBankRecord
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      swiftCode: r.swiftCode,
      country: r.country,
      accountCategory: r.accountCategory as 'national' | 'international',
      supportedPaymentMethods: (r.supportedPaymentMethods as TBankPaymentMethod[] | null) ?? null,
      logoUrl: r.logoUrl,
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TBankCreate): Record<string, unknown> {
    return {
      name: dto.name,
      code: dto.code,
      swiftCode: dto.swiftCode,
      country: dto.country,
      accountCategory: dto.accountCategory,
      supportedPaymentMethods: dto.supportedPaymentMethods,
      logoUrl: dto.logoUrl,
      isActive: dto.isActive,
      metadata: dto.metadata,
    }
  }

  protected mapToUpdateValues(dto: Partial<TBankCreate>): Record<string, unknown> {
    const values: Record<string, unknown> = {}
    if (dto.name !== undefined) values.name = dto.name
    if (dto.code !== undefined) values.code = dto.code
    if (dto.swiftCode !== undefined) values.swiftCode = dto.swiftCode
    if (dto.country !== undefined) values.country = dto.country
    if (dto.accountCategory !== undefined) values.accountCategory = dto.accountCategory
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    return values
  }

  async listFiltered(query: TBanksQuerySchema): Promise<TBank[]> {
    const conditions: SQL[] = []

    conditions.push(eq(banks.isActive, true))

    if (query.country) {
      conditions.push(eq(banks.country, query.country))
    }

    if (query.accountCategory) {
      conditions.push(eq(banks.accountCategory, query.accountCategory))
    }

    if (query.search && query.search.trim()) {
      const searchTerm = `%${query.search.trim()}%`
      conditions.push(ilike(banks.name, searchTerm))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const results = await this.db
      .select()
      .from(banks)
      .where(whereClause)
      .orderBy(banks.name)

    return results.map(record => this.mapToEntity(record))
  }

  async getByCodeAndCountry(code: string, country: string): Promise<TBank | null> {
    const results = await this.db
      .select()
      .from(banks)
      .where(and(eq(banks.code, code), eq(banks.country, country)))
      .limit(1)

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }
}
