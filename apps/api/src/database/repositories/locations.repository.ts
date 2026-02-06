import { eq } from 'drizzle-orm'
import type { TLocation, TLocationCreate, TLocationUpdate } from '@packages/domain'
import { locations } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TLocationRecord = typeof locations.$inferSelect

/**
 * Repository for managing location entities (countries, provinces, cities).
 * Implements soft delete pattern via isActive flag.
 */
export class LocationsRepository
  extends BaseRepository<typeof locations, TLocation, TLocationCreate, TLocationUpdate>
  implements IRepository<TLocation, TLocationCreate, TLocationUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, locations)
  }

  protected mapToEntity(record: unknown): TLocation {
    const r = record as TLocationRecord
    return {
      id: r.id,
      name: r.name,
      locationType: r.locationType,
      parentId: r.parentId,
      code: r.code,
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TLocationCreate): Record<string, unknown> {
    return {
      name: dto.name,
      locationType: dto.locationType,
      parentId: dto.parentId,
      code: dto.code,
      isActive: dto.isActive,
      metadata: dto.metadata,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TLocationUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.name !== undefined) values.name = dto.name
    if (dto.locationType !== undefined) values.locationType = dto.locationType
    if (dto.parentId !== undefined) values.parentId = dto.parentId
    if (dto.code !== undefined) values.code = dto.code
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
  }

  /**
   * Retrieves all child locations of a parent location.
   */
  async getByParentId(parentId: string): Promise<TLocation[]> {
    const results = await this.db.select().from(locations).where(eq(locations.parentId, parentId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves locations by type (country, province, city).
   */
  async getByType(
    locationType: TLocation['locationType'],
    includeInactive = false
  ): Promise<TLocation[]> {
    const results = await this.db
      .select()
      .from(locations)
      .where(eq(locations.locationType, locationType))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(location => location.isActive)
  }

  /**
   * Retrieves a location with its complete hierarchy (parent chain).
   * Returns the location with nested parent objects all the way to the root (country).
   */
  async getByIdWithHierarchy(id: string): Promise<TLocation | null> {
    const location = await this.getById(id)
    if (!location) {
      return null
    }

    // If location has no parent, return it as is
    if (!location.parentId) {
      return location
    }

    // Recursively load parent hierarchy
    const parent = await this.getByIdWithHierarchy(location.parentId)

    return {
      ...location,
      parent: parent ?? undefined,
    }
  }
}
