import { and, eq } from 'drizzle-orm'
import type { TBuilding, TBuildingCreate, TBuildingUpdate } from '@packages/domain'
import { buildings } from '../drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TBuildingRecord = typeof buildings.$inferSelect

/**
 * Repository for managing building entities.
 * Implements soft delete pattern via isActive flag.
 */
export class BuildingsRepository
  extends BaseRepository<typeof buildings, TBuilding, TBuildingCreate, TBuildingUpdate>
  implements IRepository<TBuilding, TBuildingCreate, TBuildingUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, buildings)
  }

  protected mapToEntity(record: unknown): TBuilding {
    const r = record as TBuildingRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      name: r.name,
      code: r.code,
      address: r.address,
      floorsCount: r.floorsCount,
      unitsCount: r.unitsCount,
      bankAccountHolder: r.bankAccountHolder,
      bankName: r.bankName,
      bankAccountNumber: r.bankAccountNumber,
      bankAccountType: r.bankAccountType as TBuilding['bankAccountType'],
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  /**
   * Retrieves buildings by condominium.
   */
  async getByCondominiumId(condominiumId: string, includeInactive = false): Promise<TBuilding[]> {
    const results = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.condominiumId, condominiumId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(b => b.isActive)
  }

  /**
   * Retrieves a building by condominium and code.
   */
  async getByCondominiumAndCode(condominiumId: string, code: string): Promise<TBuilding | null> {
    const results = await this.db
      .select()
      .from(buildings)
      .where(and(eq(buildings.condominiumId, condominiumId), eq(buildings.code, code)))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }
}
