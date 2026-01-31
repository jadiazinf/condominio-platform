import { and, eq, isNotNull } from 'drizzle-orm'
import type {
  TPaymentConcept,
  TPaymentConceptCreate,
  TPaymentConceptUpdate,
} from '@packages/domain'
import { paymentConcepts } from '@database/drizzle/schema'
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
}
