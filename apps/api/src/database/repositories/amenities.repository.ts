import { eq } from 'drizzle-orm'
import type { TAmenity, TAmenityCreate, TAmenityUpdate } from '@packages/domain'
import { amenities } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TAmenityRecord = typeof amenities.$inferSelect

/**
 * Repository for managing amenity entities.
 * Implements soft delete pattern via isActive flag.
 */
export class AmenitiesRepository
  extends BaseRepository<typeof amenities, TAmenity, TAmenityCreate, TAmenityUpdate>
  implements IRepository<TAmenity, TAmenityCreate, TAmenityUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, amenities)
  }

  protected mapToEntity(record: unknown): TAmenity {
    const r = record as TAmenityRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      name: r.name,
      description: r.description,
      location: r.location,
      capacity: r.capacity,
      requiresApproval: r.requiresApproval ?? false,
      reservationRules: r.reservationRules as Record<string, unknown> | null,
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TAmenityCreate): Record<string, unknown> {
    return {
      condominiumId: dto.condominiumId,
      name: dto.name,
      description: dto.description,
      location: dto.location,
      capacity: dto.capacity,
      requiresApproval: dto.requiresApproval,
      reservationRules: dto.reservationRules,
      isActive: dto.isActive,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TAmenityUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.condominiumId !== undefined) values.condominiumId = dto.condominiumId
    if (dto.name !== undefined) values.name = dto.name
    if (dto.description !== undefined) values.description = dto.description
    if (dto.location !== undefined) values.location = dto.location
    if (dto.capacity !== undefined) values.capacity = dto.capacity
    if (dto.requiresApproval !== undefined) values.requiresApproval = dto.requiresApproval
    if (dto.reservationRules !== undefined) values.reservationRules = dto.reservationRules
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  /**
   * Retrieves amenities by condominium.
   */
  async getByCondominiumId(condominiumId: string, includeInactive = false): Promise<TAmenity[]> {
    const results = await this.db
      .select()
      .from(amenities)
      .where(eq(amenities.condominiumId, condominiumId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(a => a.isActive)
  }
}
