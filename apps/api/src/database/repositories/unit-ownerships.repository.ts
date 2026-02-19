import { and, eq, inArray } from 'drizzle-orm'
import type { TUnitOwnership, TUnitOwnershipCreate, TUnitOwnershipUpdate } from '@packages/domain'
import { unitOwnerships, units, buildings } from '@database/drizzle/schema'
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
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      phoneCountryCode: r.phoneCountryCode,
      isRegistered: r.isRegistered ?? false,
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
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      phoneCountryCode: dto.phoneCountryCode,
      isRegistered: dto.isRegistered,
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
    if (dto.fullName !== undefined) values.fullName = dto.fullName
    if (dto.email !== undefined) values.email = dto.email
    if (dto.phone !== undefined) values.phone = dto.phone
    if (dto.phoneCountryCode !== undefined) values.phoneCountryCode = dto.phoneCountryCode
    if (dto.isRegistered !== undefined) values.isRegistered = dto.isRegistered
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
   * Retrieves unregistered residents for a unit (userId is null).
   */
  async getUnregisteredByUnit(unitId: string): Promise<TUnitOwnership[]> {
    const results = await this.db
      .select()
      .from(unitOwnerships)
      .where(
        and(
          eq(unitOwnerships.unitId, unitId),
          eq(unitOwnerships.isActive, true),
          eq(unitOwnerships.isRegistered, false)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Links a user account to an existing ownership (when a resident registers).
   */
  async linkUserToOwnership(ownershipId: string, userId: string): Promise<TUnitOwnership | null> {
    const results = await this.db
      .update(unitOwnerships)
      .set({
        userId,
        isRegistered: true,
        updatedAt: new Date(),
      })
      .where(eq(unitOwnerships.id, ownershipId))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Marks all active, unregistered ownerships for a user in a condominium as registered.
   * Used when a user accepts an invitation — confirms their ownership.
   */
  async markAsRegisteredByUserAndCondominium(userId: string, condominiumId: string): Promise<void> {
    const condominiumUnitIds = this.db
      .select({ id: units.id })
      .from(units)
      .innerJoin(buildings, eq(units.buildingId, buildings.id))
      .where(eq(buildings.condominiumId, condominiumId))

    await this.db
      .update(unitOwnerships)
      .set({ isRegistered: true, updatedAt: new Date() })
      .where(
        and(
          eq(unitOwnerships.userId, userId),
          eq(unitOwnerships.isRegistered, false),
          eq(unitOwnerships.isActive, true),
          inArray(unitOwnerships.unitId, condominiumUnitIds)
        )
      )
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
