import { and, eq, lte, gte, isNull, or } from 'drizzle-orm'
import type {
  TInterestConfiguration,
  TInterestConfigurationCreate,
  TInterestConfigurationUpdate,
} from '@packages/domain'
import { interestConfigurations } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TInterestConfigurationRecord = typeof interestConfigurations.$inferSelect

/**
 * Repository for managing interest configuration entities.
 * Implements soft delete pattern via isActive flag.
 */
export class InterestConfigurationsRepository
  extends BaseRepository<
    typeof interestConfigurations,
    TInterestConfiguration,
    TInterestConfigurationCreate,
    TInterestConfigurationUpdate
  >
  implements
    IRepository<TInterestConfiguration, TInterestConfigurationCreate, TInterestConfigurationUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, interestConfigurations)
  }

  protected mapToEntity(record: unknown): TInterestConfiguration {
    const r = record as TInterestConfigurationRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      paymentConceptId: r.paymentConceptId,
      name: r.name,
      description: r.description,
      interestType: r.interestType as TInterestConfiguration['interestType'],
      interestRate: r.interestRate,
      fixedAmount: r.fixedAmount,
      calculationPeriod: r.calculationPeriod as TInterestConfiguration['calculationPeriod'],
      gracePeriodDays: r.gracePeriodDays ?? 0,
      currencyId: r.currencyId,
      isActive: r.isActive ?? true,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TInterestConfigurationCreate): Record<string, unknown> {
    return {
      condominiumId: dto.condominiumId,
      buildingId: dto.buildingId,
      paymentConceptId: dto.paymentConceptId,
      name: dto.name,
      description: dto.description,
      interestType: dto.interestType,
      interestRate: dto.interestRate,
      fixedAmount: dto.fixedAmount,
      calculationPeriod: dto.calculationPeriod,
      gracePeriodDays: dto.gracePeriodDays,
      currencyId: dto.currencyId,
      isActive: dto.isActive,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TInterestConfigurationUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.condominiumId !== undefined) values.condominiumId = dto.condominiumId
    if (dto.buildingId !== undefined) values.buildingId = dto.buildingId
    if (dto.paymentConceptId !== undefined) values.paymentConceptId = dto.paymentConceptId
    if (dto.name !== undefined) values.name = dto.name
    if (dto.description !== undefined) values.description = dto.description
    if (dto.interestType !== undefined) values.interestType = dto.interestType
    if (dto.interestRate !== undefined) values.interestRate = dto.interestRate
    if (dto.fixedAmount !== undefined) values.fixedAmount = dto.fixedAmount
    if (dto.calculationPeriod !== undefined) values.calculationPeriod = dto.calculationPeriod
    if (dto.gracePeriodDays !== undefined) values.gracePeriodDays = dto.gracePeriodDays
    if (dto.currencyId !== undefined) values.currencyId = dto.currencyId
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.effectiveFrom !== undefined) values.effectiveFrom = dto.effectiveFrom
    if (dto.effectiveTo !== undefined) values.effectiveTo = dto.effectiveTo
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  /**
   * Retrieves interest configurations by condominium.
   */
  async getByCondominiumId(
    condominiumId: string,
    includeInactive = false
  ): Promise<TInterestConfiguration[]> {
    const results = await this.db
      .select()
      .from(interestConfigurations)
      .where(eq(interestConfigurations.condominiumId, condominiumId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves interest configurations by payment concept.
   */
  async getByPaymentConceptId(
    paymentConceptId: string,
    includeInactive = false
  ): Promise<TInterestConfiguration[]> {
    const results = await this.db
      .select()
      .from(interestConfigurations)
      .where(eq(interestConfigurations.paymentConceptId, paymentConceptId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves active interest configuration for a date.
   */
  async getActiveForDate(
    paymentConceptId: string,
    date: string
  ): Promise<TInterestConfiguration | null> {
    const results = await this.db
      .select()
      .from(interestConfigurations)
      .where(
        and(
          eq(interestConfigurations.paymentConceptId, paymentConceptId),
          eq(interestConfigurations.isActive, true),
          lte(interestConfigurations.effectiveFrom, date),
          or(
            isNull(interestConfigurations.effectiveTo),
            gte(interestConfigurations.effectiveTo, date)
          )
        )
      )
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }
}
