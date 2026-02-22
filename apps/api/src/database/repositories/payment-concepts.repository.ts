import { and, eq, isNotNull, ilike, sql, desc } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type {
  TPaymentConcept,
  TPaymentConceptCreate,
  TPaymentConceptUpdate,
  TPaginatedResponse,
  TPaymentConceptsQuerySchema,
} from '@packages/domain'
import { paymentConcepts, condominiumManagementCompanies, condominiums } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TPaymentConceptRecord = typeof paymentConcepts.$inferSelect

/**
 * Repository for managing payment concept entities.
 * Implements soft delete pattern via isActive flag.
 */
export class PaymentConceptsRepository
  extends BaseRepository<
    typeof paymentConcepts,
    TPaymentConcept,
    TPaymentConceptCreate,
    TPaymentConceptUpdate
  >
  implements IRepository<TPaymentConcept, TPaymentConceptCreate, TPaymentConceptUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, paymentConcepts)
  }

  protected mapToEntity(record: unknown): TPaymentConcept {
    const r = record as TPaymentConceptRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      name: r.name,
      description: r.description,
      conceptType: r.conceptType as TPaymentConcept['conceptType'],
      isRecurring: r.isRecurring ?? true,
      recurrencePeriod: r.recurrencePeriod as TPaymentConcept['recurrencePeriod'],
      currencyId: r.currencyId,
      allowsPartialPayment: r.allowsPartialPayment ?? true,
      latePaymentType: (r.latePaymentType as TPaymentConcept['latePaymentType']) ?? 'none',
      latePaymentValue: r.latePaymentValue ? Number(r.latePaymentValue) : null,
      latePaymentGraceDays: r.latePaymentGraceDays ?? 0,
      earlyPaymentType: (r.earlyPaymentType as TPaymentConcept['earlyPaymentType']) ?? 'none',
      earlyPaymentValue: r.earlyPaymentValue ? Number(r.earlyPaymentValue) : null,
      earlyPaymentDaysBeforeDue: r.earlyPaymentDaysBeforeDue ?? 0,
      issueDay: r.issueDay,
      dueDay: r.dueDay,
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TPaymentConceptCreate): Record<string, unknown> {
    return {
      condominiumId: dto.condominiumId,
      buildingId: dto.buildingId,
      name: dto.name,
      description: dto.description,
      conceptType: dto.conceptType,
      isRecurring: dto.isRecurring,
      recurrencePeriod: dto.recurrencePeriod,
      currencyId: dto.currencyId,
      allowsPartialPayment: dto.allowsPartialPayment,
      latePaymentType: dto.latePaymentType,
      latePaymentValue: dto.latePaymentValue?.toString(),
      latePaymentGraceDays: dto.latePaymentGraceDays,
      earlyPaymentType: dto.earlyPaymentType,
      earlyPaymentValue: dto.earlyPaymentValue?.toString(),
      earlyPaymentDaysBeforeDue: dto.earlyPaymentDaysBeforeDue,
      issueDay: dto.issueDay,
      dueDay: dto.dueDay,
      isActive: dto.isActive,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TPaymentConceptUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.condominiumId !== undefined) values.condominiumId = dto.condominiumId
    if (dto.buildingId !== undefined) values.buildingId = dto.buildingId
    if (dto.name !== undefined) values.name = dto.name
    if (dto.description !== undefined) values.description = dto.description
    if (dto.conceptType !== undefined) values.conceptType = dto.conceptType
    if (dto.isRecurring !== undefined) values.isRecurring = dto.isRecurring
    if (dto.recurrencePeriod !== undefined) values.recurrencePeriod = dto.recurrencePeriod
    if (dto.currencyId !== undefined) values.currencyId = dto.currencyId
    if (dto.allowsPartialPayment !== undefined) values.allowsPartialPayment = dto.allowsPartialPayment
    if (dto.latePaymentType !== undefined) values.latePaymentType = dto.latePaymentType
    if (dto.latePaymentValue !== undefined) values.latePaymentValue = dto.latePaymentValue?.toString()
    if (dto.latePaymentGraceDays !== undefined) values.latePaymentGraceDays = dto.latePaymentGraceDays
    if (dto.earlyPaymentType !== undefined) values.earlyPaymentType = dto.earlyPaymentType
    if (dto.earlyPaymentValue !== undefined) values.earlyPaymentValue = dto.earlyPaymentValue?.toString()
    if (dto.earlyPaymentDaysBeforeDue !== undefined) values.earlyPaymentDaysBeforeDue = dto.earlyPaymentDaysBeforeDue
    if (dto.issueDay !== undefined) values.issueDay = dto.issueDay
    if (dto.dueDay !== undefined) values.dueDay = dto.dueDay
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  /**
   * Retrieves payment concepts by condominium.
   */
  async getByCondominiumId(
    condominiumId: string,
    includeInactive = false
  ): Promise<TPaymentConcept[]> {
    const results = await this.db
      .select()
      .from(paymentConcepts)
      .where(eq(paymentConcepts.condominiumId, condominiumId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves payment concepts by building.
   */
  async getByBuildingId(buildingId: string, includeInactive = false): Promise<TPaymentConcept[]> {
    const results = await this.db
      .select()
      .from(paymentConcepts)
      .where(eq(paymentConcepts.buildingId, buildingId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves recurring payment concepts.
   */
  async getRecurringConcepts(includeInactive = false): Promise<TPaymentConcept[]> {
    const results = await this.db
      .select()
      .from(paymentConcepts)
      .where(eq(paymentConcepts.isRecurring, true))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves payment concepts by type.
   */
  async getByConceptType(
    conceptType: TPaymentConcept['conceptType'],
    includeInactive = false
  ): Promise<TPaymentConcept[]> {
    const results = await this.db
      .select()
      .from(paymentConcepts)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle schema column type differs from domain union type
      .where(eq(paymentConcepts.conceptType, conceptType as any))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Lists payment concepts across all condominiums of a management company with pagination and filters.
   */
  async listByManagementCompanyPaginated(
    managementCompanyId: string,
    query: TPaymentConceptsQuerySchema
  ): Promise<TPaginatedResponse<TPaymentConcept & { condominiumName: string | null }>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    const conditions: SQL[] = [
      eq(condominiumManagementCompanies.managementCompanyId, managementCompanyId),
    ]

    // Default to active only
    if (query.isActive === undefined || query.isActive === true) {
      conditions.push(eq(paymentConcepts.isActive, true))
    } else if (query.isActive === false) {
      conditions.push(eq(paymentConcepts.isActive, false))
    }

    if (query.search) {
      conditions.push(ilike(paymentConcepts.name, `%${query.search}%`))
    }

    if (query.conceptType) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle schema column type differs from domain union type
      conditions.push(eq(paymentConcepts.conceptType, query.conceptType as any))
    }

    if (query.condominiumId) {
      conditions.push(eq(paymentConcepts.condominiumId, query.condominiumId))
    }

    if (query.isRecurring !== undefined) {
      conditions.push(eq(paymentConcepts.isRecurring, query.isRecurring))
    }

    const whereClause = and(...conditions)

    const results = await this.db
      .select({
        concept: paymentConcepts,
        condominiumName: condominiums.name,
      })
      .from(paymentConcepts)
      .innerJoin(
        condominiumManagementCompanies,
        eq(paymentConcepts.condominiumId, condominiumManagementCompanies.condominiumId)
      )
      .leftJoin(condominiums, eq(paymentConcepts.condominiumId, condominiums.id))
      .where(whereClause)
      .orderBy(desc(paymentConcepts.createdAt))
      .limit(limit)
      .offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentConcepts)
      .innerJoin(
        condominiumManagementCompanies,
        eq(paymentConcepts.condominiumId, condominiumManagementCompanies.condominiumId)
      )
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    return {
      data: results.map(row => ({
        ...this.mapToEntity(row.concept),
        condominiumName: row.condominiumName,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }
}
