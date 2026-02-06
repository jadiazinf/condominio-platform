import { eq, desc, and, isNull, lte, sql } from 'drizzle-orm'
import type {
  TSubscriptionTermsConditions,
  TSubscriptionTermsConditionsCreate,
  TSubscriptionTermsConditionsUpdate,
  TPaginatedResponse,
} from '@packages/domain'
import { subscriptionTermsConditions } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TTermsRecord = typeof subscriptionTermsConditions.$inferSelect

export interface ITermsQuery {
  page?: number
  limit?: number
  isActive?: boolean
}

/**
 * Repository for managing subscription terms and conditions.
 * Handles versioned T&C documents for subscription acceptances.
 */
export class SubscriptionTermsConditionsRepository
  extends BaseRepository<
    typeof subscriptionTermsConditions,
    TSubscriptionTermsConditions,
    TSubscriptionTermsConditionsCreate,
    TSubscriptionTermsConditionsUpdate
  >
  implements
    IRepository<
      TSubscriptionTermsConditions,
      TSubscriptionTermsConditionsCreate,
      TSubscriptionTermsConditionsUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, subscriptionTermsConditions)
  }

  protected mapToEntity(record: unknown): TSubscriptionTermsConditions {
    const r = record as TTermsRecord
    return {
      id: r.id,
      version: r.version,
      title: r.title,
      content: r.content,
      summary: r.summary,
      effectiveFrom: r.effectiveFrom,
      effectiveUntil: r.effectiveUntil,
      isActive: r.isActive,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }

  protected mapToInsertValues(dto: TSubscriptionTermsConditionsCreate): Record<string, unknown> {
    return {
      version: dto.version,
      title: dto.title,
      content: dto.content,
      summary: dto.summary,
      effectiveFrom: dto.effectiveFrom,
      effectiveUntil: dto.effectiveUntil,
      isActive: dto.isActive,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TSubscriptionTermsConditionsUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.version !== undefined) values.version = dto.version
    if (dto.title !== undefined) values.title = dto.title
    if (dto.content !== undefined) values.content = dto.content
    if (dto.summary !== undefined) values.summary = dto.summary
    if (dto.effectiveFrom !== undefined) values.effectiveFrom = dto.effectiveFrom
    if (dto.effectiveUntil !== undefined) values.effectiveUntil = dto.effectiveUntil
    if (dto.isActive !== undefined) values.isActive = dto.isActive

    return values
  }

  /**
   * Get the currently active terms and conditions
   */
  async getActiveTerms(): Promise<TSubscriptionTermsConditions | null> {
    const now = new Date()
    const results = await this.db
      .select()
      .from(subscriptionTermsConditions)
      .where(
        and(
          eq(subscriptionTermsConditions.isActive, true),
          lte(subscriptionTermsConditions.effectiveFrom, now)
        )
      )
      .orderBy(desc(subscriptionTermsConditions.effectiveFrom))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Get terms by version
   */
  async getByVersion(version: string): Promise<TSubscriptionTermsConditions | null> {
    const results = await this.db
      .select()
      .from(subscriptionTermsConditions)
      .where(eq(subscriptionTermsConditions.version, version))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Deactivate terms and conditions
   */
  async deactivate(id: string): Promise<TSubscriptionTermsConditions | null> {
    const results = await this.db
      .update(subscriptionTermsConditions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(subscriptionTermsConditions.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Get all terms with pagination
   */
  async getAllPaginated(query: ITermsQuery): Promise<TPaginatedResponse<TSubscriptionTermsConditions>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = []

    if (query.isActive !== undefined) {
      conditions.push(eq(subscriptionTermsConditions.isActive, query.isActive))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptionTermsConditions)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    // Get paginated results
    const results = await this.db
      .select()
      .from(subscriptionTermsConditions)
      .where(whereClause)
      .orderBy(desc(subscriptionTermsConditions.effectiveFrom))
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
