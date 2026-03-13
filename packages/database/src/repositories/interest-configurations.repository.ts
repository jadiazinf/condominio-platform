import { and, eq, lte, gte, isNull, or } from 'drizzle-orm'
import type {
  TInterestConfiguration,
  TInterestConfigurationCreate,
  TInterestConfigurationUpdate,
} from '@packages/domain'
import { interestConfigurations } from '../drizzle/schema'
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
