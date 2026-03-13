import { eq } from 'drizzle-orm'
import type { TAmenity, TAmenityCreate, TAmenityUpdate } from '@packages/domain'
import { amenities } from '../drizzle/schema'
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
