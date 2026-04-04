import { eq, and } from 'drizzle-orm'
import type { TChargeCategory } from '@packages/domain'
import { chargeCategories } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TChargeCategoryRecord = typeof chargeCategories.$inferSelect
type TChargeCategoryCreate = Omit<TChargeCategory, 'id' | 'createdAt' | 'updatedAt'>
type TChargeCategoryUpdate = Partial<TChargeCategoryCreate>

export class ChargeCategoriesRepository extends BaseRepository<
  typeof chargeCategories,
  TChargeCategory,
  TChargeCategoryCreate,
  TChargeCategoryUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, chargeCategories)
  }

  protected mapToEntity(record: unknown): TChargeCategory {
    const r = record as TChargeCategoryRecord
    return {
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      labels: (r.labels ?? {}) as Record<string, string>,
      isSystem: r.isSystem ?? false,
      isActive: r.isActive ?? true,
      sortOrder: r.sortOrder ?? 0,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  /** Find a category by its slug/key name */
  async findByName(name: string): Promise<TChargeCategory | null> {
    const results = await this.db
      .select()
      .from(chargeCategories)
      .where(eq(chargeCategories.name, name))
      .limit(1)

    return results[0] ? this.mapToEntity(results[0]) : null
  }

  /** List user-visible categories (non-system, active) for admin UI */
  async listUserVisible(): Promise<TChargeCategory[]> {
    const results = await this.db
      .select()
      .from(chargeCategories)
      .where(
        and(
          eq(chargeCategories.isSystem, false),
          eq(chargeCategories.isActive, true)
        )
      )
      .orderBy(chargeCategories.sortOrder)

    return results.map(r => this.mapToEntity(r))
  }

  /** List all active categories (including system) */
  async listAllActive(): Promise<TChargeCategory[]> {
    const results = await this.db
      .select()
      .from(chargeCategories)
      .where(eq(chargeCategories.isActive, true))
      .orderBy(chargeCategories.sortOrder)

    return results.map(r => this.mapToEntity(r))
  }
}
