import { and, eq } from 'drizzle-orm'
import type { TQuotaFormula, TQuotaFormulaCreate, TQuotaFormulaUpdate } from '@packages/domain'
import { quotaFormulas } from '../drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TQuotaFormulaRecord = typeof quotaFormulas.$inferSelect

/**
 * Repository for managing quota formula entities.
 * Quota formulas are reusable templates for calculating quota amounts.
 * Implements soft delete pattern via isActive flag.
 */
export class QuotaFormulasRepository
  extends BaseRepository<
    typeof quotaFormulas,
    TQuotaFormula,
    TQuotaFormulaCreate,
    TQuotaFormulaUpdate
  >
  implements IRepository<TQuotaFormula, TQuotaFormulaCreate, TQuotaFormulaUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, quotaFormulas)
  }

  protected mapToEntity(record: unknown): TQuotaFormula {
    const r = record as TQuotaFormulaRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      name: r.name,
      description: r.description,
      formulaType: r.formulaType as TQuotaFormula['formulaType'],
      fixedAmount: r.fixedAmount,
      expression: r.expression,
      variables: r.variables as Record<string, unknown> | null,
      unitAmounts: r.unitAmounts as Record<string, unknown> | null,
      currencyId: r.currencyId,
      isActive: r.isActive ?? true,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt ?? new Date(),
      updateReason: r.updateReason,
    }
  }

  /**
   * Retrieves quota formulas by condominium.
   */
  async getByCondominiumId(
    condominiumId: string,
    includeInactive = false
  ): Promise<TQuotaFormula[]> {
    const conditions = includeInactive
      ? eq(quotaFormulas.condominiumId, condominiumId)
      : and(eq(quotaFormulas.condominiumId, condominiumId), eq(quotaFormulas.isActive, true))

    const results = await this.db.select().from(quotaFormulas).where(conditions)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves quota formulas by type.
   */
  async getByFormulaType(
    formulaType: TQuotaFormula['formulaType'],
    includeInactive = false
  ): Promise<TQuotaFormula[]> {
    const conditions = includeInactive
      ? eq(quotaFormulas.formulaType, formulaType)
      : and(eq(quotaFormulas.formulaType, formulaType), eq(quotaFormulas.isActive, true))

    const results = await this.db.select().from(quotaFormulas).where(conditions)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves active quota formulas for a condominium by type.
   */
  async getByCondominiumAndType(
    condominiumId: string,
    formulaType: TQuotaFormula['formulaType']
  ): Promise<TQuotaFormula[]> {
    const results = await this.db
      .select()
      .from(quotaFormulas)
      .where(
        and(
          eq(quotaFormulas.condominiumId, condominiumId),
          eq(quotaFormulas.formulaType, formulaType),
          eq(quotaFormulas.isActive, true)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves formulas created by a specific user.
   */
  async getByCreatedBy(userId: string): Promise<TQuotaFormula[]> {
    const results = await this.db
      .select()
      .from(quotaFormulas)
      .where(eq(quotaFormulas.createdBy, userId))

    return results.map(record => this.mapToEntity(record))
  }
}
