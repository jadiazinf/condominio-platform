import { eq, desc, lt, and, sql } from 'drizzle-orm'
import type {
  TSubscriptionAcceptance,
  TSubscriptionAcceptanceCreate,
  TAcceptanceStatus,
} from '@packages/domain'
import { subscriptionAcceptances } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TAcceptanceRecord = typeof subscriptionAcceptances.$inferSelect

/**
 * Repository for managing subscription acceptances.
 * Handles token-based acceptance workflow for subscriptions.
 */
export class SubscriptionAcceptancesRepository {
  constructor(private readonly db: TDrizzleClient) {}

  private mapToEntity(record: TAcceptanceRecord): TSubscriptionAcceptance {
    return {
      id: record.id,
      subscriptionId: record.subscriptionId,
      termsConditionsId: record.termsConditionsId,
      token: record.token,
      tokenHash: record.tokenHash,
      status: record.status,
      expiresAt: record.expiresAt,
      acceptedBy: record.acceptedBy,
      acceptedAt: record.acceptedAt,
      acceptorEmail: record.acceptorEmail,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      createdAt: record.createdAt,
    }
  }

  /**
   * Create a new acceptance record
   */
  async create(data: TSubscriptionAcceptanceCreate): Promise<TSubscriptionAcceptance> {
    const results = await this.db
      .insert(subscriptionAcceptances)
      .values({
        subscriptionId: data.subscriptionId,
        termsConditionsId: data.termsConditionsId,
        token: data.token,
        tokenHash: data.tokenHash,
        status: data.status,
        expiresAt: data.expiresAt,
        acceptedBy: data.acceptedBy,
        acceptedAt: data.acceptedAt,
        acceptorEmail: data.acceptorEmail,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      })
      .returning()

    const record = results[0]
    if (!record) {
      throw new Error('Failed to create subscription acceptance')
    }
    return this.mapToEntity(record)
  }

  /**
   * Get acceptance by ID
   */
  async getById(id: string): Promise<TSubscriptionAcceptance | null> {
    const results = await this.db
      .select()
      .from(subscriptionAcceptances)
      .where(eq(subscriptionAcceptances.id, id))
      .limit(1)

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Get acceptance by token hash (for validation)
   */
  async getByTokenHash(tokenHash: string): Promise<TSubscriptionAcceptance | null> {
    const results = await this.db
      .select()
      .from(subscriptionAcceptances)
      .where(eq(subscriptionAcceptances.tokenHash, tokenHash))
      .limit(1)

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Get pending acceptance by subscription ID
   */
  async getPendingBySubscriptionId(subscriptionId: string): Promise<TSubscriptionAcceptance | null> {
    const results = await this.db
      .select()
      .from(subscriptionAcceptances)
      .where(
        and(
          eq(subscriptionAcceptances.subscriptionId, subscriptionId),
          eq(subscriptionAcceptances.status, 'pending')
        )
      )
      .orderBy(desc(subscriptionAcceptances.createdAt))
      .limit(1)

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Get all acceptances for a subscription
   */
  async getBySubscriptionId(subscriptionId: string): Promise<TSubscriptionAcceptance[]> {
    const results = await this.db
      .select()
      .from(subscriptionAcceptances)
      .where(eq(subscriptionAcceptances.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionAcceptances.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Mark acceptance as accepted
   */
  async markAsAccepted(
    id: string,
    userId: string,
    email: string,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<TSubscriptionAcceptance | null> {
    const results = await this.db
      .update(subscriptionAcceptances)
      .set({
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: new Date(),
        acceptorEmail: email,
        ipAddress,
        userAgent,
      })
      .where(eq(subscriptionAcceptances.id, id))
      .returning()

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Mark acceptance as expired
   */
  async markAsExpired(id: string): Promise<TSubscriptionAcceptance | null> {
    const results = await this.db
      .update(subscriptionAcceptances)
      .set({ status: 'expired' })
      .where(eq(subscriptionAcceptances.id, id))
      .returning()

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Mark acceptance as cancelled
   */
  async markAsCancelled(id: string): Promise<TSubscriptionAcceptance | null> {
    const results = await this.db
      .update(subscriptionAcceptances)
      .set({ status: 'cancelled' })
      .where(eq(subscriptionAcceptances.id, id))
      .returning()

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Expire all pending acceptances past their expiration date (batch operation)
   */
  async expireOldPendingAcceptances(): Promise<number> {
    const now = new Date()
    const result = await this.db
      .update(subscriptionAcceptances)
      .set({ status: 'expired' })
      .where(
        and(
          eq(subscriptionAcceptances.status, 'pending'),
          lt(subscriptionAcceptances.expiresAt, now)
        )
      )

    // Drizzle doesn't return count directly, so we need to count affected rows
    // This is a simplified version - actual implementation may vary
    return (result as { rowCount?: number }).rowCount ?? 0
  }

  /**
   * Update acceptance status
   */
  async updateStatus(id: string, status: TAcceptanceStatus): Promise<TSubscriptionAcceptance | null> {
    const results = await this.db
      .update(subscriptionAcceptances)
      .set({ status })
      .where(eq(subscriptionAcceptances.id, id))
      .returning()

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }
}
