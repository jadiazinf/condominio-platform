import { and, eq, desc, gte, lte, sql } from 'drizzle-orm'
import type { TAuditLog, TAuditLogCreate, TPaginatedResponse } from '@packages/domain'
import { auditLogs } from '../drizzle/schema'
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
    const results = await this.db
      .insert(auditLogs)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values({ ...data } as any)
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
   * Retrieves audit logs for a specific table and record with pagination.
   */
  async getByTableAndRecordPaginated(
    tableName: string,
    recordId: string,
    query: { page?: number; limit?: number; action?: string; dateFrom?: string; dateTo?: string }
  ): Promise<TPaginatedResponse<TAuditLog>> {
    const { page = 1, limit = 10, action, dateFrom, dateTo } = query
    const offset = (page - 1) * limit

    const conditions = [eq(auditLogs.tableName, tableName), eq(auditLogs.recordId, recordId)]

    if (action) {
      conditions.push(eq(auditLogs.action, action as TAuditLog['action']))
    }
    if (dateFrom) {
      conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)))
    }
    if (dateTo) {
      conditions.push(lte(auditLogs.createdAt, new Date(dateTo)))
    }

    const whereClause = and(...conditions)

    const [results, countResult] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(whereClause),
    ])

    const total = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: results.map(record => this.mapToEntity(record)),
      pagination: { page, limit, total, totalPages },
    }
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
