import { and, eq, isNull, lte, gte, or } from 'drizzle-orm'
import type {
  TQuotaGenerationRule,
  TQuotaGenerationRuleCreate,
  TQuotaGenerationRuleUpdate,
} from '@packages/domain'
import { quotaGenerationRules } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TQuotaGenerationRuleRecord = typeof quotaGenerationRules.$inferSelect

/**
 * Repository for managing quota generation rule entities.
 * Rules define which formula to use for a specific payment concept
 * within a date range.
 * Implements soft delete pattern via isActive flag.
 */
export class QuotaGenerationRulesRepository
  extends BaseRepository<
    typeof quotaGenerationRules,
    TQuotaGenerationRule,
    TQuotaGenerationRuleCreate,
    TQuotaGenerationRuleUpdate
  >
  implements IRepository<TQuotaGenerationRule, TQuotaGenerationRuleCreate, TQuotaGenerationRuleUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, quotaGenerationRules)
  }

  protected mapToEntity(record: unknown): TQuotaGenerationRule {
    const r = record as TQuotaGenerationRuleRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      paymentConceptId: r.paymentConceptId,
      quotaFormulaId: r.quotaFormulaId,
      name: r.name,
      description: r.description,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      isActive: r.isActive ?? true,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt ?? new Date(),
      updateReason: r.updateReason,
    }
  }

  protected mapToInsertValues(dto: TQuotaGenerationRuleCreate): Record<string, unknown> {
    return {
      condominiumId: dto.condominiumId,
      buildingId: dto.buildingId,
      paymentConceptId: dto.paymentConceptId,
      quotaFormulaId: dto.quotaFormulaId,
      name: dto.name,
      description: dto.description,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
      isActive: dto.isActive,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TQuotaGenerationRuleUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.buildingId !== undefined) values.buildingId = dto.buildingId
    if (dto.paymentConceptId !== undefined) values.paymentConceptId = dto.paymentConceptId
    if (dto.quotaFormulaId !== undefined) values.quotaFormulaId = dto.quotaFormulaId
    if (dto.name !== undefined) values.name = dto.name
    if (dto.description !== undefined) values.description = dto.description
    if (dto.effectiveFrom !== undefined) values.effectiveFrom = dto.effectiveFrom
    if (dto.effectiveTo !== undefined) values.effectiveTo = dto.effectiveTo
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.updatedBy !== undefined) values.updatedBy = dto.updatedBy
    if (dto.updateReason !== undefined) values.updateReason = dto.updateReason

    return values
  }

  /**
   * Retrieves rules by condominium.
   */
  async getByCondominiumId(
    condominiumId: string,
    includeInactive = false
  ): Promise<TQuotaGenerationRule[]> {
    const conditions = includeInactive
      ? eq(quotaGenerationRules.condominiumId, condominiumId)
      : and(
          eq(quotaGenerationRules.condominiumId, condominiumId),
          eq(quotaGenerationRules.isActive, true)
        )

    const results = await this.db.select().from(quotaGenerationRules).where(conditions)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves rules by building (for building-specific rules).
   */
  async getByBuildingId(
    buildingId: string,
    includeInactive = false
  ): Promise<TQuotaGenerationRule[]> {
    const conditions = includeInactive
      ? eq(quotaGenerationRules.buildingId, buildingId)
      : and(
          eq(quotaGenerationRules.buildingId, buildingId),
          eq(quotaGenerationRules.isActive, true)
        )

    const results = await this.db.select().from(quotaGenerationRules).where(conditions)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves rules for a specific payment concept.
   */
  async getByPaymentConceptId(
    paymentConceptId: string,
    includeInactive = false
  ): Promise<TQuotaGenerationRule[]> {
    const conditions = includeInactive
      ? eq(quotaGenerationRules.paymentConceptId, paymentConceptId)
      : and(
          eq(quotaGenerationRules.paymentConceptId, paymentConceptId),
          eq(quotaGenerationRules.isActive, true)
        )

    const results = await this.db.select().from(quotaGenerationRules).where(conditions)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves rules that use a specific formula.
   */
  async getByQuotaFormulaId(quotaFormulaId: string): Promise<TQuotaGenerationRule[]> {
    const results = await this.db
      .select()
      .from(quotaGenerationRules)
      .where(eq(quotaGenerationRules.quotaFormulaId, quotaFormulaId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves active rules effective for a specific date.
   * A rule is effective if:
   * - effectiveFrom <= targetDate
   * - AND (effectiveTo >= targetDate OR effectiveTo IS NULL)
   */
  async getEffectiveRulesForDate(
    condominiumId: string,
    targetDate: string
  ): Promise<TQuotaGenerationRule[]> {
    const results = await this.db
      .select()
      .from(quotaGenerationRules)
      .where(
        and(
          eq(quotaGenerationRules.condominiumId, condominiumId),
          eq(quotaGenerationRules.isActive, true),
          lte(quotaGenerationRules.effectiveFrom, targetDate),
          or(
            isNull(quotaGenerationRules.effectiveTo),
            gte(quotaGenerationRules.effectiveTo, targetDate)
          )
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves active rules effective for a specific date within a building.
   */
  async getEffectiveRulesForDateAndBuilding(
    buildingId: string,
    targetDate: string
  ): Promise<TQuotaGenerationRule[]> {
    const results = await this.db
      .select()
      .from(quotaGenerationRules)
      .where(
        and(
          eq(quotaGenerationRules.buildingId, buildingId),
          eq(quotaGenerationRules.isActive, true),
          lte(quotaGenerationRules.effectiveFrom, targetDate),
          or(
            isNull(quotaGenerationRules.effectiveTo),
            gte(quotaGenerationRules.effectiveTo, targetDate)
          )
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Gets the applicable rule for a specific payment concept on a date.
   * Prioritizes building-specific rules over condominium-level rules.
   */
  async getApplicableRule(
    condominiumId: string,
    paymentConceptId: string,
    targetDate: string,
    buildingId?: string
  ): Promise<TQuotaGenerationRule | null> {
    // First try to find a building-specific rule if buildingId is provided
    if (buildingId) {
      const buildingRule = await this.db
        .select()
        .from(quotaGenerationRules)
        .where(
          and(
            eq(quotaGenerationRules.condominiumId, condominiumId),
            eq(quotaGenerationRules.buildingId, buildingId),
            eq(quotaGenerationRules.paymentConceptId, paymentConceptId),
            eq(quotaGenerationRules.isActive, true),
            lte(quotaGenerationRules.effectiveFrom, targetDate),
            or(
              isNull(quotaGenerationRules.effectiveTo),
              gte(quotaGenerationRules.effectiveTo, targetDate)
            )
          )
        )
        .limit(1)

      if (buildingRule.length > 0) {
        return this.mapToEntity(buildingRule[0])
      }
    }

    // Fall back to condominium-level rule (buildingId is NULL)
    const condominiumRule = await this.db
      .select()
      .from(quotaGenerationRules)
      .where(
        and(
          eq(quotaGenerationRules.condominiumId, condominiumId),
          isNull(quotaGenerationRules.buildingId),
          eq(quotaGenerationRules.paymentConceptId, paymentConceptId),
          eq(quotaGenerationRules.isActive, true),
          lte(quotaGenerationRules.effectiveFrom, targetDate),
          or(
            isNull(quotaGenerationRules.effectiveTo),
            gte(quotaGenerationRules.effectiveTo, targetDate)
          )
        )
      )
      .limit(1)

    if (condominiumRule.length > 0) {
      return this.mapToEntity(condominiumRule[0])
    }

    return null
  }

  /**
   * Retrieves rules created by a specific user.
   */
  async getByCreatedBy(userId: string): Promise<TQuotaGenerationRule[]> {
    const results = await this.db
      .select()
      .from(quotaGenerationRules)
      .where(eq(quotaGenerationRules.createdBy, userId))

    return results.map(record => this.mapToEntity(record))
  }
}
