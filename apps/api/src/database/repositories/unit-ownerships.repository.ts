import { and, eq } from 'drizzle-orm'
import type { TUnitOwnership, TUnitOwnershipCreate, TUnitOwnershipUpdate } from '@packages/domain'
import { unitOwnerships } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TUnitOwnershipRecord = typeof unitOwnerships.$inferSelect

/**
 * Repository for managing unit ownership entities.
 * Implements soft delete pattern via isActive flag.
 */
export class UnitOwnershipsRepository
  extends BaseRepository<
    typeof unitOwnerships,
    TUnitOwnership,
    TUnitOwnershipCreate,
    TUnitOwnershipUpdate
  >
  implements IRepository<TUnitOwnership, TUnitOwnershipCreate, TUnitOwnershipUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, unitOwnerships)
  }

  protected mapToEntity(record: unknown): TUnitOwnership {
    const r = record as TUnitOwnershipRecord
    return {
      id: r.id,
      unitId: r.unitId,
      userId: r.userId,
      ownershipType: r.ownershipType as TUnitOwnership['ownershipType'],
      ownershipPercentage: r.ownershipPercentage,
      titleDeedNumber: r.titleDeedNumber,
      titleDeedDate: r.titleDeedDate,
      startDate: r.startDate,
      endDate: r.endDate,
      isActive: r.isActive ?? true,
      isPrimaryResidence: r.isPrimaryResidence ?? false,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TUnitOwnershipCreate): Record<string, unknown> {
    return {
      unitId: dto.unitId,
      userId: dto.userId,
      ownershipType: dto.ownershipType,
      ownershipPercentage: dto.ownershipPercentage,
      titleDeedNumber: dto.titleDeedNumber,
      titleDeedDate: dto.titleDeedDate,
      startDate: dto.startDate,
      endDate: dto.endDate,
      isActive: dto.isActive,
      isPrimaryResidence: dto.isPrimaryResidence,
      metadata: dto.metadata,
    }
  }

  protected mapToUpdateValues(dto: TUnitOwnershipUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.unitId !== undefined) values.unitId = dto.unitId
    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.ownershipType !== undefined) values.ownershipType = dto.ownershipType
    if (dto.ownershipPercentage !== undefined) values.ownershipPercentage = dto.ownershipPercentage
    if (dto.titleDeedNumber !== undefined) values.titleDeedNumber = dto.titleDeedNumber
    if (dto.titleDeedDate !== undefined) values.titleDeedDate = dto.titleDeedDate
    if (dto.startDate !== undefined) values.startDate = dto.startDate
    if (dto.endDate !== undefined) values.endDate = dto.endDate
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.isPrimaryResidence !== undefined) values.isPrimaryResidence = dto.isPrimaryResidence
    if (dto.metadata !== undefined) values.metadata = dto.metadata

    return values
  }

  /**
   * Retrieves ownerships by unit.
   */
  async getByUnitId(unitId: string, includeInactive = false): Promise<TUnitOwnership[]> {
    const results = await this.db
      .select()
      .from(unitOwnerships)
      .where(eq(unitOwnerships.unitId, unitId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(o => o.isActive)
  }

  /**
   * Retrieves ownerships by user.
   */
  async getByUserId(userId: string, includeInactive = false): Promise<TUnitOwnership[]> {
    const results = await this.db
      .select()
      .from(unitOwnerships)
      .where(eq(unitOwnerships.userId, userId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(o => o.isActive)
  }

  /**
   * Retrieves ownership by unit and user.
   */
  async getByUnitAndUser(unitId: string, userId: string): Promise<TUnitOwnership | null> {
    const results = await this.db
      .select()
      .from(unitOwnerships)
      .where(and(eq(unitOwnerships.unitId, unitId), eq(unitOwnerships.userId, userId)))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves the primary residence for a user.
   */
  async getPrimaryResidenceByUser(userId: string): Promise<TUnitOwnership | null> {
    const results = await this.db
      .select()
      .from(unitOwnerships)
      .where(
        and(
          eq(unitOwnerships.userId, userId),
          eq(unitOwnerships.isPrimaryResidence, true),
          eq(unitOwnerships.isActive, true)
        )
      )
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }
}
