import { eq, desc, sql, and, gte, lte } from 'drizzle-orm'
import type {
  TSubscriptionAuditHistory,
  TSubscriptionAuditHistoryCreate,
  TSubscriptionAuditAction,
  TPaginatedResponse,
} from '@packages/domain'
import { subscriptionAuditHistory } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TAuditHistoryRecord = typeof subscriptionAuditHistory.$inferSelect

export interface IAuditHistoryQuery {
  page?: number
  limit?: number
  action?: TSubscriptionAuditAction
  dateFrom?: Date
  dateTo?: Date
}

/**
 * Repository for managing subscription audit history entries.
 * Tracks all changes made to subscriptions for traceability.
 */
export class SubscriptionAuditHistoryRepository {
  constructor(private readonly db: TDrizzleClient) {}

  private mapToEntity(record: TAuditHistoryRecord): TSubscriptionAuditHistory {
    return {
      id: record.id,
      subscriptionId: record.subscriptionId,
      action: record.action,
      previousValues: record.previousValues as Record<string, unknown> | null,
      newValues: record.newValues as Record<string, unknown> | null,
      changedFields: record.changedFields,
      performedBy: record.performedBy,
      performedAt: record.performedAt,
      reason: record.reason,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
    }
  }

  /**
   * Create a new audit history entry
   */
  async create(data: TSubscriptionAuditHistoryCreate): Promise<TSubscriptionAuditHistory> {
    const results = await this.db
      .insert(subscriptionAuditHistory)
      .values({
        subscriptionId: data.subscriptionId,
        action: data.action,
        previousValues: data.previousValues,
        newValues: data.newValues,
        changedFields: data.changedFields,
        performedBy: data.performedBy,
        performedAt: data.performedAt,
        reason: data.reason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      })
      .returning()

    const record = results[0]
    if (!record) {
      throw new Error('Failed to create subscription audit history entry')
    }
    return this.mapToEntity(record)
  }

  /**
   * Get all audit history entries for a subscription
   */
  async getBySubscriptionId(subscriptionId: string): Promise<TSubscriptionAuditHistory[]> {
    const results = await this.db
      .select()
      .from(subscriptionAuditHistory)
      .where(eq(subscriptionAuditHistory.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionAuditHistory.performedAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Get paginated audit history for a subscription with filtering
   */
  async getBySubscriptionIdPaginated(
    subscriptionId: string,
    query: IAuditHistoryQuery
  ): Promise<TPaginatedResponse<TSubscriptionAuditHistory>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = [eq(subscriptionAuditHistory.subscriptionId, subscriptionId)]

    if (query.action) {
      conditions.push(eq(subscriptionAuditHistory.action, query.action))
    }

    if (query.dateFrom) {
      conditions.push(gte(subscriptionAuditHistory.performedAt, query.dateFrom))
    }

    if (query.dateTo) {
      conditions.push(lte(subscriptionAuditHistory.performedAt, query.dateTo))
    }

    const whereClause = and(...conditions)

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptionAuditHistory)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    // Get paginated results
    const results = await this.db
      .select()
      .from(subscriptionAuditHistory)
      .where(whereClause)
      .orderBy(desc(subscriptionAuditHistory.performedAt))
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

  /**
   * Get audit entries by action type
   */
  async getByAction(action: TSubscriptionAuditAction): Promise<TSubscriptionAuditHistory[]> {
    const results = await this.db
      .select()
      .from(subscriptionAuditHistory)
      .where(eq(subscriptionAuditHistory.action, action))
      .orderBy(desc(subscriptionAuditHistory.performedAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Get audit entries by user who performed the action
   */
  async getByPerformedBy(userId: string): Promise<TSubscriptionAuditHistory[]> {
    const results = await this.db
      .select()
      .from(subscriptionAuditHistory)
      .where(eq(subscriptionAuditHistory.performedBy, userId))
      .orderBy(desc(subscriptionAuditHistory.performedAt))

    return results.map(record => this.mapToEntity(record))
  }
}
