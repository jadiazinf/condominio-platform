import { and, eq, inArray } from 'drizzle-orm'
import type { TUnit, TUnitCreate, TUnitUpdate } from '@packages/domain'
import { units, buildings } from '../drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TUnitRecord = typeof units.$inferSelect

/**
 * Repository for managing unit entities.
 * Implements soft delete pattern via isActive flag.
 */
export class UnitsRepository
  extends BaseRepository<typeof units, TUnit, TUnitCreate, TUnitUpdate>
  implements IRepository<TUnit, TUnitCreate, TUnitUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, units)
  }

  protected mapToEntity(record: unknown): TUnit {
    const r = record as TUnitRecord
    return {
      id: r.id,
      buildingId: r.buildingId,
      unitNumber: r.unitNumber,
      floor: r.floor,
      areaM2: r.areaM2,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      parkingSpaces: r.parkingSpaces ?? 0,
      parkingIdentifiers: r.parkingIdentifiers,
      storageIdentifier: r.storageIdentifier,
      aliquotPercentage: r.aliquotPercentage,
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  /**
   * Retrieves units by building.
   */
  async getByBuildingId(
    buildingId: string,
    includeInactive = false,
    condominiumId?: string
  ): Promise<TUnit[]> {
    const conditions = [eq(units.buildingId, buildingId)]

    if (condominiumId) {
      conditions.push(eq(buildings.condominiumId, condominiumId))
    }

    const results = condominiumId
      ? await this.db
          .select({ units })
          .from(units)
          .innerJoin(buildings, eq(units.buildingId, buildings.id))
          .where(and(...conditions))
          .then(rows => rows.map(r => r.units))
      : await this.db.select().from(units).where(eq(units.buildingId, buildingId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(u => u.isActive)
  }

  /**
   * Retrieves a unit by building and unit number.
   */
  async getByBuildingAndNumber(
    buildingId: string,
    unitNumber: string,
    condominiumId?: string
  ): Promise<TUnit | null> {
    const conditions = [eq(units.buildingId, buildingId), eq(units.unitNumber, unitNumber)]

    if (condominiumId) {
      conditions.push(eq(buildings.condominiumId, condominiumId))
    }

    const results = condominiumId
      ? await this.db
          .select({ units })
          .from(units)
          .innerJoin(buildings, eq(units.buildingId, buildings.id))
          .where(and(...conditions))
          .limit(1)
          .then(rows => rows.map(r => r.units))
      : await this.db
          .select()
          .from(units)
          .where(and(eq(units.buildingId, buildingId), eq(units.unitNumber, unitNumber)))
          .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves all units belonging to a condominium (via buildings).
   */
  async getByCondominiumId(condominiumId: string): Promise<TUnit[]> {
    const buildingIds = await this.db
      .select({ id: buildings.id })
      .from(buildings)
      .where(eq(buildings.condominiumId, condominiumId))

    if (buildingIds.length === 0) return []

    const ids = buildingIds.map(b => b.id)
    const results = await this.db.select().from(units).where(inArray(units.buildingId, ids))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves units by floor.
   */
  async getByFloor(buildingId: string, floor: number, condominiumId?: string): Promise<TUnit[]> {
    const conditions = [eq(units.buildingId, buildingId), eq(units.floor, floor)]

    if (condominiumId) {
      conditions.push(eq(buildings.condominiumId, condominiumId))
    }

    const results = condominiumId
      ? await this.db
          .select({ units })
          .from(units)
          .innerJoin(buildings, eq(units.buildingId, buildings.id))
          .where(and(...conditions))
          .then(rows => rows.map(r => r.units))
      : await this.db
          .select()
          .from(units)
          .where(and(eq(units.buildingId, buildingId), eq(units.floor, floor)))

    return results.map(record => this.mapToEntity(record))
  }
}
