import { eq, and, desc, sql, isNull, type SQL } from 'drizzle-orm'
import type {
  TServiceExecution,
  TServiceExecutionCreate,
  TServiceExecutionUpdate,
  TPaginatedResponse,
} from '@packages/domain'
import { serviceExecutions } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TServiceExecutionRecord = typeof serviceExecutions.$inferSelect

export class ServiceExecutionsRepository extends BaseRepository<
  typeof serviceExecutions,
  TServiceExecution,
  TServiceExecutionCreate,
  TServiceExecutionUpdate
> implements IRepositoryWithHardDelete<TServiceExecution, TServiceExecutionCreate, TServiceExecutionUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, serviceExecutions)
  }

  protected mapToEntity(record: unknown): TServiceExecution {
    const r = record as TServiceExecutionRecord
    return {
      id: r.id,
      serviceId: r.serviceId,
      condominiumId: r.condominiumId,
      paymentConceptId: r.paymentConceptId ?? null,
      title: r.title,
      description: r.description,
      executionDate: r.executionDate,
      totalAmount: r.totalAmount,
      currencyId: r.currencyId,
      status: (r.status ?? 'draft') as TServiceExecution['status'],
      invoiceNumber: r.invoiceNumber,
      items: (r.items as TServiceExecution['items']) ?? [],
      attachments: (r.attachments as TServiceExecution['attachments']) ?? [],
      notes: r.notes,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TServiceExecutionCreate): Record<string, unknown> {
    return {
      serviceId: dto.serviceId,
      condominiumId: dto.condominiumId,
      paymentConceptId: dto.paymentConceptId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      executionDate: dto.executionDate,
      totalAmount: String(dto.totalAmount),
      currencyId: dto.currencyId,
      status: dto.status ?? 'draft',
      invoiceNumber: dto.invoiceNumber ?? null,
      items: dto.items ?? [],
      attachments: dto.attachments ?? [],
      notes: dto.notes ?? null,
    }
  }

  protected mapToUpdateValues(dto: TServiceExecutionUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}
    if (dto.title !== undefined) values.title = dto.title
    if (dto.description !== undefined) values.description = dto.description
    if (dto.executionDate !== undefined) values.executionDate = dto.executionDate
    if (dto.totalAmount !== undefined) values.totalAmount = String(dto.totalAmount)
    if (dto.currencyId !== undefined) values.currencyId = dto.currencyId
    if (dto.status !== undefined) values.status = dto.status
    if (dto.invoiceNumber !== undefined) values.invoiceNumber = dto.invoiceNumber
    if (dto.items !== undefined) values.items = dto.items
    if (dto.attachments !== undefined) values.attachments = dto.attachments
    if (dto.notes !== undefined) values.notes = dto.notes
    values.updatedAt = new Date()
    return values
  }

  /**
   * List executions for a service with pagination and optional filters.
   */
  async getByServiceIdPaginated(
    serviceId: string,
    options: {
      page?: number
      limit?: number
      status?: 'draft' | 'confirmed'
      conceptId?: string | null
    } = {}
  ): Promise<TPaginatedResponse<TServiceExecution>> {
    const { page = 1, limit = 20, status, conceptId } = options
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(serviceExecutions.serviceId, serviceId)]
    if (status) {
      conditions.push(eq(serviceExecutions.status, status))
    }
    if (conceptId !== undefined) {
      if (conceptId === null) {
        conditions.push(isNull(serviceExecutions.paymentConceptId))
      } else {
        conditions.push(eq(serviceExecutions.paymentConceptId, conceptId))
      }
    }

    const whereClause = and(...conditions)

    const results = await this.db
      .select()
      .from(serviceExecutions)
      .where(whereClause)
      .orderBy(desc(serviceExecutions.executionDate))
      .limit(limit)
      .offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(serviceExecutions)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: results.map(record => this.mapToEntity(record)),
      pagination: { page, limit, total, totalPages },
    }
  }

  /**
   * Hard delete an execution by ID (physical deletion).
   */
  async hardDelete(id: string): Promise<void> {
    await this.db.delete(serviceExecutions).where(eq(serviceExecutions.id, id))
  }
}
