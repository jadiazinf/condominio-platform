import { and, eq, desc } from 'drizzle-orm'
import type { TUserFcmToken, TUserFcmTokenCreate, TUserFcmTokenUpdate } from '@packages/domain'
import { userFcmTokens } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TUserFcmTokenRecord = typeof userFcmTokens.$inferSelect

/**
 * Repository for managing user FCM token entities.
 * Uses hard delete since tokens should be completely removed when invalidated.
 */
export class UserFcmTokensRepository
  extends BaseRepository<
    typeof userFcmTokens,
    TUserFcmToken,
    TUserFcmTokenCreate,
    TUserFcmTokenUpdate
  >
  implements IRepositoryWithHardDelete<TUserFcmToken, TUserFcmTokenCreate, TUserFcmTokenUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, userFcmTokens)
  }

  protected mapToEntity(record: unknown): TUserFcmToken {
    const r = record as TUserFcmTokenRecord
    return {
      id: r.id,
      userId: r.userId,
      token: r.token,
      platform: r.platform as TUserFcmToken['platform'],
      deviceName: r.deviceName,
      isActive: r.isActive ?? true,
      lastUsedAt: r.lastUsedAt,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TUserFcmTokenCreate): Record<string, unknown> {
    return {
      userId: dto.userId,
      token: dto.token,
      platform: dto.platform,
      deviceName: dto.deviceName,
      isActive: dto.isActive,
      metadata: dto.metadata,
    }
  }

  protected mapToUpdateValues(dto: TUserFcmTokenUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.deviceName !== undefined) values.deviceName = dto.deviceName
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.lastUsedAt !== undefined) values.lastUsedAt = dto.lastUsedAt
    if (dto.metadata !== undefined) values.metadata = dto.metadata

    values.updatedAt = new Date()

    return values
  }

  /**
   * Override listAll since we want all tokens ordered by creation.
   */
  override async listAll(): Promise<TUserFcmToken[]> {
    const results = await this.db
      .select()
      .from(userFcmTokens)
      .orderBy(desc(userFcmTokens.createdAt))
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves all active tokens for a user.
   */
  async getActiveByUserId(userId: string): Promise<TUserFcmToken[]> {
    const results = await this.db
      .select()
      .from(userFcmTokens)
      .where(and(eq(userFcmTokens.userId, userId), eq(userFcmTokens.isActive, true)))
      .orderBy(desc(userFcmTokens.lastUsedAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves all tokens for a user (including inactive).
   */
  async getByUserId(userId: string): Promise<TUserFcmToken[]> {
    const results = await this.db
      .select()
      .from(userFcmTokens)
      .where(eq(userFcmTokens.userId, userId))
      .orderBy(desc(userFcmTokens.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Finds a token by its value.
   */
  async getByToken(token: string): Promise<TUserFcmToken | null> {
    const results = await this.db
      .select()
      .from(userFcmTokens)
      .where(eq(userFcmTokens.token, token))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Finds a token by user and token value.
   */
  async getByUserAndToken(userId: string, token: string): Promise<TUserFcmToken | null> {
    const results = await this.db
      .select()
      .from(userFcmTokens)
      .where(and(eq(userFcmTokens.userId, userId), eq(userFcmTokens.token, token)))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Registers or updates a token for a user.
   * If the token exists, updates lastUsedAt. If not, creates a new record.
   */
  async upsertToken(
    userId: string,
    token: string,
    platform: TUserFcmToken['platform'],
    deviceName?: string | null
  ): Promise<TUserFcmToken> {
    const existing = await this.getByUserAndToken(userId, token)

    if (existing) {
      const updated = await this.update(existing.id, {
        lastUsedAt: new Date(),
        isActive: true,
        deviceName: deviceName ?? existing.deviceName,
      })
      return updated!
    }

    return this.create({
      userId,
      token,
      platform,
      deviceName: deviceName ?? null,
      isActive: true,
      metadata: null,
    })
  }

  /**
   * Deactivates a token.
   */
  async deactivateToken(token: string): Promise<boolean> {
    const existing = await this.getByToken(token)
    if (!existing) return false

    const updated = await this.update(existing.id, { isActive: false })
    return updated !== null
  }

  /**
   * Deactivates all tokens for a user.
   */
  async deactivateAllByUserId(userId: string): Promise<number> {
    const results = await this.db
      .update(userFcmTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(userFcmTokens.userId, userId))
      .returning()

    return results.length
  }

  /**
   * Deletes a token by its value.
   */
  async deleteByToken(token: string): Promise<boolean> {
    const results = await this.db
      .delete(userFcmTokens)
      .where(eq(userFcmTokens.token, token))
      .returning()

    return results.length > 0
  }

  /**
   * Deletes all tokens for a user.
   */
  async deleteByUserId(userId: string): Promise<number> {
    const results = await this.db
      .delete(userFcmTokens)
      .where(eq(userFcmTokens.userId, userId))
      .returning()

    return results.length
  }

  /**
   * Updates lastUsedAt for a token.
   */
  async touchToken(token: string): Promise<boolean> {
    const existing = await this.getByToken(token)
    if (!existing) return false

    const updated = await this.update(existing.id, { lastUsedAt: new Date() })
    return updated !== null
  }

  /**
   * Gets tokens by platform for a user.
   */
  async getByUserAndPlatform(
    userId: string,
    platform: TUserFcmToken['platform']
  ): Promise<TUserFcmToken[]> {
    const results = await this.db
      .select()
      .from(userFcmTokens)
      .where(
        and(
          eq(userFcmTokens.userId, userId),
          eq(userFcmTokens.platform, platform),
          eq(userFcmTokens.isActive, true)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }
}
