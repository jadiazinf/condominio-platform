import { and, eq, desc, gte, lte } from 'drizzle-orm'
import type { TAuditLog, TAuditLogCreate } from '@packages/domain'
import { auditLogs } from '@database/drizzle/schema'
import type { TDrizzleClient, IReadOnlyRepository } from './interfaces'

type TAuditLogRecord = typeof auditLogs.$inferSelect

/**
 * Repository for managing audit log entities.
 * Read-only repository - audit logs cannot be updated or deleted.
 */
export class AuditLogsRepository implements IReadOnlyRepository<TAuditLog, TAuditLogCreate> {
  protected readonly db: TDrizzleClient

  constructor(db: TDrizzleClient) {
    this.db = db
  }

  protected mapToEntity(record: unknown): TAuditLog {
    const r = record as TAuditLogRecord
    return {
      id: r.id,
      tableName: r.tableName,
      recordId: r.recordId,
      action: r.action as TAuditLog['action'],
      oldValues: r.oldValues as Record<string, unknown> | null,
      newValues: r.newValues as Record<string, unknown> | null,
      changedFields: r.changedFields,
      userId: r.userId,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TAuditLogCreate): Record<string, unknown> {
    return {
      tableName: dto.tableName,
      recordId: dto.recordId,
      action: dto.action,
      oldValues: dto.oldValues,
      newValues: dto.newValues,
      changedFields: dto.changedFields,
      userId: dto.userId,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    }
  }

  /**
   * Retrieves all audit logs.
   */
  async listAll(): Promise<TAuditLog[]> {
    const results = await this.db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt))
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves an audit log by ID.
   */
  async getById(id: string): Promise<TAuditLog | null> {
    const results = await this.db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Creates a new audit log.
   */
  async create(data: TAuditLogCreate): Promise<TAuditLog> {
    const insertValues = this.mapToInsertValues(data)

    const results = await this.db
      .insert(auditLogs)
      .values(insertValues as any)
      .returning()

    const record = results[0]
    if (!record) {
      throw new Error('Failed to create audit log')
    }

    return this.mapToEntity(record)
  }

  /**
   * Retrieves audit logs by table name.
   */
  async getByTableName(tableName: string): Promise<TAuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tableName, tableName))
      .orderBy(desc(auditLogs.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves audit logs by record ID.
   */
  async getByRecordId(recordId: string): Promise<TAuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.recordId, recordId))
      .orderBy(desc(auditLogs.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves audit logs by user.
   */
  async getByUserId(userId: string): Promise<TAuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves audit logs by action type.
   */
  async getByAction(action: TAuditLog['action']): Promise<TAuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, action))
      .orderBy(desc(auditLogs.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves audit logs for a specific table and record.
   */
  async getByTableAndRecord(tableName: string, recordId: string): Promise<TAuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.tableName, tableName), eq(auditLogs.recordId, recordId)))
      .orderBy(desc(auditLogs.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves audit logs within a date range.
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<TAuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(and(gte(auditLogs.createdAt, startDate), lte(auditLogs.createdAt, endDate)))
      .orderBy(desc(auditLogs.createdAt))

    return results.map(record => this.mapToEntity(record))
  }
}
