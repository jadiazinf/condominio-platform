import { and, eq, desc, gte, lte, sql } from 'drizzle-orm'
import type {
  TEventLog,
  TEventLogCreate,
  TEventLogCategory,
  TEventLogLevel,
  TEventLogResult,
  TEventLogSource,
  TPaginatedResponse,
} from '@packages/domain'
import { eventLogs } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TEventLogRecord = typeof eventLogs.$inferSelect

export interface IEventLogsQuery {
  page?: number
  limit?: number
  category?: TEventLogCategory
  level?: TEventLogLevel
  result?: TEventLogResult
  source?: TEventLogSource
  condominiumId?: string
  entityType?: string
  entityId?: string
  userId?: string
  event?: string
  dateFrom?: string
  dateTo?: string
}

export class EventLogsRepository {
  protected readonly db: TDrizzleClient

  constructor(db: TDrizzleClient) {
    this.db = db
  }

  protected mapToEntity(record: unknown): TEventLog {
    const r = record as TEventLogRecord
    return {
      id: r.id,
      category: r.category as TEventLog['category'],
      level: r.level as TEventLog['level'],
      event: r.event,
      action: r.action,
      message: r.message,
      module: r.module ?? null,
      condominiumId: r.condominiumId ?? null,
      entityType: r.entityType ?? null,
      entityId: r.entityId ?? null,
      userId: r.userId ?? null,
      userRole: r.userRole ?? null,
      result: r.result as TEventLog['result'],
      errorCode: r.errorCode ?? null,
      errorMessage: r.errorMessage ?? null,
      metadata: r.metadata as Record<string, unknown> | null,
      durationMs: r.durationMs ?? null,
      source: r.source as TEventLog['source'],
      ipAddress: r.ipAddress ?? null,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  async getById(id: string): Promise<TEventLog | null> {
    const results = await this.db
      .select()
      .from(eventLogs)
      .where(eq(eventLogs.id, id))
      .limit(1)

    return results.length > 0 ? this.mapToEntity(results[0]) : null
  }

  async create(data: TEventLogCreate): Promise<TEventLog> {
    const results = await this.db
      .insert(eventLogs)
      .values({ ...data } as never)
      .returning()

    const record = results[0]
    if (!record) throw new Error('Failed to create event log')
    return this.mapToEntity(record)
  }

  async createMany(data: TEventLogCreate[]): Promise<TEventLog[]> {
    if (data.length === 0) return []

    const results = await this.db
      .insert(eventLogs)
      .values(data.map(d => ({ ...d })) as never)
      .returning()

    return results.map(r => this.mapToEntity(r))
  }

  async listPaginated(query: IEventLogsQuery = {}): Promise<TPaginatedResponse<TEventLog>> {
    const { page = 1, limit = 20 } = query
    const offset = (page - 1) * limit
    const conditions = this.buildConditions(query)
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [results, countResult] = await Promise.all([
      this.db
        .select()
        .from(eventLogs)
        .where(whereClause)
        .orderBy(desc(eventLogs.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventLogs)
        .where(whereClause),
    ])

    const total = countResult[0]?.count ?? 0
    return {
      data: results.map(r => this.mapToEntity(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async listByCondominiumId(
    condominiumId: string,
    query: IEventLogsQuery = {}
  ): Promise<TPaginatedResponse<TEventLog>> {
    return this.listPaginated({ ...query, condominiumId })
  }

  async listByEntity(
    entityType: string,
    entityId: string,
    query: IEventLogsQuery = {}
  ): Promise<TPaginatedResponse<TEventLog>> {
    return this.listPaginated({ ...query, entityType, entityId })
  }

  private buildConditions(query: IEventLogsQuery) {
    const conditions = []

    if (query.category) conditions.push(eq(eventLogs.category, query.category))
    if (query.level) conditions.push(eq(eventLogs.level, query.level))
    if (query.result) conditions.push(eq(eventLogs.result, query.result))
    if (query.source) conditions.push(eq(eventLogs.source, query.source))
    if (query.condominiumId) conditions.push(eq(eventLogs.condominiumId, query.condominiumId))
    if (query.entityType) conditions.push(eq(eventLogs.entityType, query.entityType))
    if (query.entityId) conditions.push(eq(eventLogs.entityId, query.entityId))
    if (query.userId) conditions.push(eq(eventLogs.userId, query.userId))
    if (query.event) conditions.push(eq(eventLogs.event, query.event))
    if (query.dateFrom) conditions.push(gte(eventLogs.createdAt, new Date(query.dateFrom)))
    if (query.dateTo) conditions.push(lte(eventLogs.createdAt, new Date(query.dateTo)))

    return conditions
  }
}
