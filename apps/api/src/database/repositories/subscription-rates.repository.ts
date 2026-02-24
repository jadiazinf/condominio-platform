import { eq, desc, and, lte, gte, or, isNull, sql, ne } from 'drizzle-orm'
import type {
  TSubscriptionRate,
  TSubscriptionRateCreate,
  TSubscriptionRateUpdate,
  TPaginatedResponse,
} from '@packages/domain'
import { subscriptionRates } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TRateRecord = typeof subscriptionRates.$inferSelect

export interface IRatesQuery {
  page?: number
  limit?: number
  isActive?: boolean
}

/**
 * Repository for managing subscription rates.
 * Handles versioned pricing rates with historical tracking.
 */
export class SubscriptionRatesRepository
  extends BaseRepository<
    typeof subscriptionRates,
    TSubscriptionRate,
    TSubscriptionRateCreate,
    TSubscriptionRateUpdate
  >
  implements
    IRepository<
      TSubscriptionRate,
      TSubscriptionRateCreate,
      TSubscriptionRateUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, subscriptionRates)
  }

  protected mapToEntity(record: unknown): TSubscriptionRate {
    const r = record as TRateRecord
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      condominiumRate: parseFloat(r.condominiumRate),
      unitRate: parseFloat(r.unitRate),
      userRate: parseFloat(r.userRate),
      annualDiscountPercentage: parseFloat(r.annualDiscountPercentage),
      taxRate: r.taxRate ? parseFloat(r.taxRate) : null,
      minCondominiums: r.minCondominiums,
      maxCondominiums: r.maxCondominiums,
      version: r.version,
      isActive: r.isActive,
      effectiveFrom: r.effectiveFrom,
      effectiveUntil: r.effectiveUntil,
      createdBy: r.createdBy,
      updatedBy: r.updatedBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }

  protected mapToInsertValues(dto: TSubscriptionRateCreate): Record<string, unknown> {
    return {
      name: dto.name,
      description: dto.description,
      condominiumRate: dto.condominiumRate.toString(),
      unitRate: dto.unitRate.toString(),
      userRate: dto.userRate.toString(),
      annualDiscountPercentage: dto.annualDiscountPercentage ?? 15,
      taxRate: dto.taxRate != null ? dto.taxRate.toString() : null,
      minCondominiums: dto.minCondominiums ?? 1,
      maxCondominiums: dto.maxCondominiums,
      version: dto.version,
      isActive: dto.isActive,
      effectiveFrom: dto.effectiveFrom,
      effectiveUntil: dto.effectiveUntil,
      createdBy: dto.createdBy,
      updatedBy: dto.updatedBy,
    }
  }

  protected mapToUpdateValues(dto: TSubscriptionRateUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.name !== undefined) values.name = dto.name
    if (dto.description !== undefined) values.description = dto.description
    if (dto.condominiumRate !== undefined) values.condominiumRate = dto.condominiumRate.toString()
    if (dto.unitRate !== undefined) values.unitRate = dto.unitRate.toString()
    if (dto.userRate !== undefined) values.userRate = dto.userRate.toString()
    if (dto.annualDiscountPercentage !== undefined) values.annualDiscountPercentage = dto.annualDiscountPercentage
    if (dto.taxRate !== undefined) values.taxRate = dto.taxRate != null ? dto.taxRate.toString() : null
    if (dto.minCondominiums !== undefined) values.minCondominiums = dto.minCondominiums
    if (dto.maxCondominiums !== undefined) values.maxCondominiums = dto.maxCondominiums
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.effectiveFrom !== undefined) values.effectiveFrom = dto.effectiveFrom
    if (dto.effectiveUntil !== undefined) values.effectiveUntil = dto.effectiveUntil
    if (dto.updatedBy !== undefined) values.updatedBy = dto.updatedBy

    return values
  }

  /**
   * Get the currently active subscription rate (first active rate, for backwards compatibility)
   */
  async getActiveRate(): Promise<TSubscriptionRate | null> {
    const now = new Date()
    const results = await this.db
      .select()
      .from(subscriptionRates)
      .where(
        and(
          eq(subscriptionRates.isActive, true),
          lte(subscriptionRates.effectiveFrom, now)
        )
      )
      .orderBy(desc(subscriptionRates.effectiveFrom))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Get all active rates (for tiered pricing)
   */
  async getActiveRates(): Promise<TSubscriptionRate[]> {
    const now = new Date()
    const results = await this.db
      .select()
      .from(subscriptionRates)
      .where(
        and(
          eq(subscriptionRates.isActive, true),
          lte(subscriptionRates.effectiveFrom, now)
        )
      )
      .orderBy(subscriptionRates.minCondominiums)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Get the appropriate rate based on condominium count (tiered pricing)
   * Finds the active rate where condominiumCount falls within [minCondominiums, maxCondominiums]
   */
  async getRateForCondominiumCount(condominiumCount: number): Promise<TSubscriptionRate | null> {
    const now = new Date()
    const results = await this.db
      .select()
      .from(subscriptionRates)
      .where(
        and(
          eq(subscriptionRates.isActive, true),
          lte(subscriptionRates.effectiveFrom, now),
          lte(subscriptionRates.minCondominiums, condominiumCount),
          or(
            isNull(subscriptionRates.maxCondominiums),
            gte(subscriptionRates.maxCondominiums, condominiumCount)
          )
        )
      )
      .orderBy(desc(subscriptionRates.minCondominiums)) // Prefer higher tier if overlapping
      .limit(1)

    if (results.length === 0) {
      // Fallback to any active rate
      return this.getActiveRate()
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Get rate by version
   */
  async getByVersion(version: string): Promise<TSubscriptionRate | null> {
    const results = await this.db
      .select()
      .from(subscriptionRates)
      .where(eq(subscriptionRates.version, version))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Activate a rate (allows multiple active rates)
   */
  async activate(id: string, updatedBy: string): Promise<TSubscriptionRate | null> {
    // Activate the specified rate (no longer deactivates others)
    const results = await this.db
      .update(subscriptionRates)
      .set({ isActive: true, updatedAt: new Date(), updatedBy })
      .where(eq(subscriptionRates.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Deactivate a rate
   */
  async deactivate(id: string, updatedBy: string): Promise<TSubscriptionRate | null> {
    const results = await this.db
      .update(subscriptionRates)
      .set({ isActive: false, updatedAt: new Date(), updatedBy })
      .where(eq(subscriptionRates.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Get all rates with pagination
   */
  async getAllPaginated(query: IRatesQuery): Promise<TPaginatedResponse<TSubscriptionRate>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = []

    if (query.isActive !== undefined) {
      conditions.push(eq(subscriptionRates.isActive, query.isActive))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptionRates)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    // Get paginated results
    const results = await this.db
      .select()
      .from(subscriptionRates)
      .where(whereClause)
      .orderBy(desc(subscriptionRates.effectiveFrom))
      .limit(limit)
      .offset(offset)

    const data = results.map(record => this.mapToEntity(record))
    const totalPages = Math.ceil(total / limit)

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }
}
