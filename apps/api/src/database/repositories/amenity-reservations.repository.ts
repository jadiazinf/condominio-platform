import { and, eq, gte, lte } from 'drizzle-orm'
import type {
  TAmenityReservation,
  TAmenityReservationCreate,
  TAmenityReservationUpdate,
  TReservationStatus,
} from '@packages/domain'
import { amenityReservations } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TAmenityReservationRecord = typeof amenityReservations.$inferSelect

/**
 * Repository for managing amenity reservation entities.
 * Uses hard delete (no isActive field).
 */
export class AmenityReservationsRepository
  extends BaseRepository<
    typeof amenityReservations,
    TAmenityReservation,
    TAmenityReservationCreate,
    TAmenityReservationUpdate
  >
  implements
    IRepositoryWithHardDelete<TAmenityReservation, TAmenityReservationCreate, TAmenityReservationUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, amenityReservations)
  }

  protected mapToEntity(record: unknown): TAmenityReservation {
    const r = record as TAmenityReservationRecord
    return {
      id: r.id,
      amenityId: r.amenityId,
      userId: r.userId,
      startTime: r.startTime,
      endTime: r.endTime,
      status: (r.status ?? 'pending') as TReservationStatus,
      notes: r.notes,
      rejectionReason: r.rejectionReason,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt,
      cancelledAt: r.cancelledAt,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TAmenityReservationCreate): Record<string, unknown> {
    return {
      amenityId: dto.amenityId,
      userId: dto.userId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      notes: dto.notes,
      metadata: dto.metadata,
    }
  }

  protected mapToUpdateValues(dto: TAmenityReservationUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.amenityId !== undefined) values.amenityId = dto.amenityId
    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.startTime !== undefined) values.startTime = dto.startTime
    if (dto.endTime !== undefined) values.endTime = dto.endTime
    if (dto.notes !== undefined) values.notes = dto.notes
    if (dto.metadata !== undefined) values.metadata = dto.metadata

    return values
  }

  /**
   * Override delete to use hard delete since reservations have no isActive field.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves reservations by amenity ID.
   */
  async getByAmenityId(amenityId: string): Promise<TAmenityReservation[]> {
    const results = await this.db
      .select()
      .from(amenityReservations)
      .where(eq(amenityReservations.amenityId, amenityId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves reservations by user ID.
   */
  async getByUserId(userId: string): Promise<TAmenityReservation[]> {
    const results = await this.db
      .select()
      .from(amenityReservations)
      .where(eq(amenityReservations.userId, userId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves reservations by amenity and date range.
   */
  async getByAmenityAndDateRange(
    amenityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<TAmenityReservation[]> {
    const results = await this.db
      .select()
      .from(amenityReservations)
      .where(
        and(
          eq(amenityReservations.amenityId, amenityId),
          lte(amenityReservations.startTime, endTime),
          gte(amenityReservations.endTime, startTime)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves reservations by status.
   */
  async getByStatus(status: TReservationStatus): Promise<TAmenityReservation[]> {
    const results = await this.db
      .select()
      .from(amenityReservations)
      .where(eq(amenityReservations.status, status))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Marks a reservation as approved.
   */
  async markAsApproved(id: string, approvedBy: string): Promise<TAmenityReservation | null> {
    const results = await this.db
      .update(amenityReservations)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(amenityReservations.id, id))
      .returning()

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Marks a reservation as rejected.
   */
  async markAsRejected(id: string, rejectionReason?: string): Promise<TAmenityReservation | null> {
    const results = await this.db
      .update(amenityReservations)
      .set({
        status: 'rejected',
        rejectionReason: rejectionReason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(amenityReservations.id, id))
      .returning()

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Marks a reservation as cancelled.
   */
  async markAsCancelled(id: string): Promise<TAmenityReservation | null> {
    const results = await this.db
      .update(amenityReservations)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(amenityReservations.id, id))
      .returning()

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }
}
