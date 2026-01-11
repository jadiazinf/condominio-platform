import { eq, desc } from 'drizzle-orm'
import type {
  TNotificationTemplate,
  TNotificationTemplateCreate,
  TNotificationTemplateUpdate,
} from '@packages/domain'
import { notificationTemplates } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TNotificationTemplateRecord = typeof notificationTemplates.$inferSelect

/**
 * Repository for managing notification template entities.
 * Uses soft delete via isActive flag.
 */
export class NotificationTemplatesRepository extends BaseRepository<
  typeof notificationTemplates,
  TNotificationTemplate,
  TNotificationTemplateCreate,
  TNotificationTemplateUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, notificationTemplates)
  }

  protected mapToEntity(record: unknown): TNotificationTemplate {
    const r = record as TNotificationTemplateRecord
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      category: r.category as TNotificationTemplate['category'],
      subjectTemplate: r.subjectTemplate,
      bodyTemplate: r.bodyTemplate,
      variables: r.variables as string[] | null,
      defaultChannels: (r.defaultChannels ?? ['in_app']) as TNotificationTemplate['defaultChannels'],
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TNotificationTemplateCreate): Record<string, unknown> {
    return {
      code: dto.code,
      name: dto.name,
      category: dto.category,
      subjectTemplate: dto.subjectTemplate,
      bodyTemplate: dto.bodyTemplate,
      variables: dto.variables,
      defaultChannels: dto.defaultChannels,
      isActive: dto.isActive,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TNotificationTemplateUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.code !== undefined) values.code = dto.code
    if (dto.name !== undefined) values.name = dto.name
    if (dto.category !== undefined) values.category = dto.category
    if (dto.subjectTemplate !== undefined) values.subjectTemplate = dto.subjectTemplate
    if (dto.bodyTemplate !== undefined) values.bodyTemplate = dto.bodyTemplate
    if (dto.variables !== undefined) values.variables = dto.variables
    if (dto.defaultChannels !== undefined) values.defaultChannels = dto.defaultChannels
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    values.updatedAt = new Date()

    return values
  }

  /**
   * Retrieves a template by its unique code.
   */
  async getByCode(code: string): Promise<TNotificationTemplate | null> {
    const results = await this.db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.code, code))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves templates by category.
   */
  async getByCategory(
    category: TNotificationTemplate['category']
  ): Promise<TNotificationTemplate[]> {
    const results = await this.db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.category, category))
      .orderBy(desc(notificationTemplates.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves all active templates.
   */
  async getActive(): Promise<TNotificationTemplate[]> {
    const results = await this.db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.isActive, true))
      .orderBy(desc(notificationTemplates.createdAt))

    return results.map(record => this.mapToEntity(record))
  }
}
