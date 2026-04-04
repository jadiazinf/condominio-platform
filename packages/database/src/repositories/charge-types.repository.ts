import { eq, and } from 'drizzle-orm'
import type { TChargeType, TChargeCategoryName } from '@packages/domain'
import { chargeTypes, chargeCategories } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TChargeTypeRecord = typeof chargeTypes.$inferSelect
type TChargeTypeCreate = Omit<TChargeType, 'id' | 'createdAt' | 'updatedAt'>
type TChargeTypeUpdate = Partial<TChargeTypeCreate>

export class ChargeTypesRepository extends BaseRepository<
  typeof chargeTypes,
  TChargeType,
  TChargeTypeCreate,
  TChargeTypeUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, chargeTypes)
  }

  protected mapToEntity(record: unknown): TChargeType {
    const r = record as TChargeTypeRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      name: r.name,
      categoryId: r.categoryId,
      sortOrder: r.sortOrder ?? 0,
      isActive: r.isActive ?? true,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  async listByCondominium(condominiumId: string, onlyActive = true): Promise<TChargeType[]> {
    const conditions = [eq(chargeTypes.condominiumId, condominiumId)]
    if (onlyActive) conditions.push(eq(chargeTypes.isActive, true))

    const results = await this.db
      .select()
      .from(chargeTypes)
      .where(and(...conditions))

    return results.map(r => this.mapToEntity(r))
  }

  /**
   * Finds a charge type by category NAME (joining through charge_categories table).
   * Used by fee services that need to find e.g. 'interest', 'late_fee', 'discount' types.
   */
  async findByCategory(condominiumId: string, categoryName: TChargeCategoryName): Promise<TChargeType | null> {
    const results = await this.db
      .select({ chargeType: chargeTypes })
      .from(chargeTypes)
      .innerJoin(chargeCategories, eq(chargeTypes.categoryId, chargeCategories.id))
      .where(
        and(
          eq(chargeTypes.condominiumId, condominiumId),
          eq(chargeCategories.name, categoryName),
          eq(chargeTypes.isActive, true)
        )
      )
      .limit(1)

    return results[0] ? this.mapToEntity(results[0].chargeType) : null
  }

  async findByNameAndCondominium(name: string, condominiumId: string): Promise<TChargeType | null> {
    const results = await this.db
      .select()
      .from(chargeTypes)
      .where(
        and(
          eq(chargeTypes.condominiumId, condominiumId),
          eq(chargeTypes.name, name),
          eq(chargeTypes.isActive, true)
        )
      )
      .limit(1)

    return results[0] ? this.mapToEntity(results[0]) : null
  }
}
