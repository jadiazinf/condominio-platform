import { and, eq, desc } from 'drizzle-orm'
import type {
  TUserNotificationPreference,
  TUserNotificationPreferenceCreate,
  TUserNotificationPreferenceUpdate,
} from '@packages/domain'
import { userNotificationPreferences } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TUserNotificationPreferenceRecord = typeof userNotificationPreferences.$inferSelect

/**
 * Repository for managing user notification preference entities.
 * Uses hard delete since preferences don't have isActive (isEnabled is different).
 */
export class UserNotificationPreferencesRepository
  extends BaseRepository<
    typeof userNotificationPreferences,
    TUserNotificationPreference,
    TUserNotificationPreferenceCreate,
    TUserNotificationPreferenceUpdate
  >
  implements
    IRepositoryWithHardDelete<
      TUserNotificationPreference,
      TUserNotificationPreferenceCreate,
      TUserNotificationPreferenceUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, userNotificationPreferences)
  }

  protected mapToEntity(record: unknown): TUserNotificationPreference {
    const r = record as TUserNotificationPreferenceRecord
    return {
      id: r.id,
      userId: r.userId,
      category: r.category as TUserNotificationPreference['category'],
      channel: r.channel as TUserNotificationPreference['channel'],
      isEnabled: r.isEnabled ?? true,
      quietHoursStart: r.quietHoursStart,
      quietHoursEnd: r.quietHoursEnd,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TUserNotificationPreferenceCreate): Record<string, unknown> {
    return {
      userId: dto.userId,
      category: dto.category,
      channel: dto.channel,
      isEnabled: dto.isEnabled,
      quietHoursStart: dto.quietHoursStart,
      quietHoursEnd: dto.quietHoursEnd,
      metadata: dto.metadata,
    }
  }

  protected mapToUpdateValues(dto: TUserNotificationPreferenceUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.category !== undefined) values.category = dto.category
    if (dto.channel !== undefined) values.channel = dto.channel
    if (dto.isEnabled !== undefined) values.isEnabled = dto.isEnabled
    if (dto.quietHoursStart !== undefined) values.quietHoursStart = dto.quietHoursStart
    if (dto.quietHoursEnd !== undefined) values.quietHoursEnd = dto.quietHoursEnd
    if (dto.metadata !== undefined) values.metadata = dto.metadata

    values.updatedAt = new Date()

    return values
  }

  /**
   * Override listAll since preferences don't have isActive.
   */
  override async listAll(): Promise<TUserNotificationPreference[]> {
    const results = await this.db
      .select()
      .from(userNotificationPreferences)
      .orderBy(desc(userNotificationPreferences.createdAt))
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves all preferences for a user.
   */
  async getByUserId(userId: string): Promise<TUserNotificationPreference[]> {
    const results = await this.db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .orderBy(userNotificationPreferences.category, userNotificationPreferences.channel)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves preference by user, category, and channel.
   */
  async getByUserCategoryChannel(
    userId: string,
    category: TUserNotificationPreference['category'],
    channel: TUserNotificationPreference['channel']
  ): Promise<TUserNotificationPreference | null> {
    const results = await this.db
      .select()
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.category, category),
          eq(userNotificationPreferences.channel, channel)
        )
      )
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves preferences by user and category.
   */
  async getByUserAndCategory(
    userId: string,
    category: TUserNotificationPreference['category']
  ): Promise<TUserNotificationPreference[]> {
    const results = await this.db
      .select()
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.category, category)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves preferences by user and channel.
   */
  async getByUserAndChannel(
    userId: string,
    channel: TUserNotificationPreference['channel']
  ): Promise<TUserNotificationPreference[]> {
    const results = await this.db
      .select()
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.channel, channel)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Checks if a notification is enabled for a user.
   */
  async isNotificationEnabled(
    userId: string,
    category: TUserNotificationPreference['category'],
    channel: TUserNotificationPreference['channel']
  ): Promise<boolean> {
    const preference = await this.getByUserCategoryChannel(userId, category, channel)
    // If no preference exists, default to enabled
    if (!preference) return true
    return preference.isEnabled
  }

  /**
   * Upserts a preference (creates or updates).
   */
  async upsert(
    userId: string,
    category: TUserNotificationPreference['category'],
    channel: TUserNotificationPreference['channel'],
    data: Partial<TUserNotificationPreferenceCreate>
  ): Promise<TUserNotificationPreference> {
    const existing = await this.getByUserCategoryChannel(userId, category, channel)

    if (existing) {
      const updated = await this.update(existing.id, data)
      return updated!
    }

    return this.create({
      userId,
      category,
      channel,
      isEnabled: data.isEnabled ?? true,
      quietHoursStart: data.quietHoursStart ?? null,
      quietHoursEnd: data.quietHoursEnd ?? null,
      metadata: data.metadata ?? null,
    })
  }

  /**
   * Deletes all preferences for a user.
   */
  async deleteByUserId(userId: string): Promise<number> {
    const results = await this.db
      .delete(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .returning()

    return results.length
  }

  /**
   * Retrieves enabled preferences for a user.
   */
  async getEnabledByUserId(userId: string): Promise<TUserNotificationPreference[]> {
    const results = await this.db
      .select()
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.isEnabled, true)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }
}
