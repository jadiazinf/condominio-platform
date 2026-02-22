import { and, eq, inArray } from 'drizzle-orm'
import type { TUnit, TUnitCreate, TUnitUpdate } from '@packages/domain'
import { units, buildings } from '@database/drizzle/schema'
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

  protected mapToInsertValues(dto: TUnitCreate): Record<string, unknown> {
    return {
      buildingId: dto.buildingId,
      unitNumber: dto.unitNumber,
      floor: dto.floor,
      areaM2: dto.areaM2,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      parkingSpaces: dto.parkingSpaces,
      parkingIdentifiers: dto.parkingIdentifiers,
      storageIdentifier: dto.storageIdentifier,
      aliquotPercentage: dto.aliquotPercentage,
      isActive: dto.isActive,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TUnitUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.buildingId !== undefined) values.buildingId = dto.buildingId
    if (dto.unitNumber !== undefined) values.unitNumber = dto.unitNumber
    if (dto.floor !== undefined) values.floor = dto.floor
    if (dto.areaM2 !== undefined) values.areaM2 = dto.areaM2
    if (dto.bedrooms !== undefined) values.bedrooms = dto.bedrooms
    if (dto.bathrooms !== undefined) values.bathrooms = dto.bathrooms
    if (dto.parkingSpaces !== undefined) values.parkingSpaces = dto.parkingSpaces
    if (dto.parkingIdentifiers !== undefined) values.parkingIdentifiers = dto.parkingIdentifiers
    if (dto.storageIdentifier !== undefined) values.storageIdentifier = dto.storageIdentifier
    if (dto.aliquotPercentage !== undefined) values.aliquotPercentage = dto.aliquotPercentage
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  /**
   * Retrieves units by building.
   */
  async getByBuildingId(buildingId: string, includeInactive = false): Promise<TUnit[]> {
    const results = await this.db.select().from(units).where(eq(units.buildingId, buildingId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(u => u.isActive)
  }

  /**
   * Retrieves a unit by building and unit number.
   */
  async getByBuildingAndNumber(buildingId: string, unitNumber: string): Promise<TUnit | null> {
    const results = await this.db
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
    const results = await this.db
      .select()
      .from(units)
      .where(inArray(units.buildingId, ids))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves units by floor.
   */
  async getByFloor(buildingId: string, floor: number): Promise<TUnit[]> {
    const results = await this.db
      .select()
      .from(units)
      .where(and(eq(units.buildingId, buildingId), eq(units.floor, floor)))

    return results.map(record => this.mapToEntity(record))
  }
}
