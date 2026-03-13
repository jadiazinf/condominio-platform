import { and, eq, inArray } from 'drizzle-orm'
import type { TUnitOwnership, TUnitOwnershipCreate, TUnitOwnershipUpdate } from '@packages/domain'
import { unitOwnerships, units, buildings, users, userInvitations } from '../drizzle/schema'
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
      idDocumentType: r.idDocumentType,
      idDocumentNumber: r.idDocumentNumber,
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

  /**
   * Retrieves ownerships by unit.
   * Derives isRegistered from user_invitations.status (matched by userId + unitId):
   * - No invitation → directly added user → verified
   * - Invitation with status='accepted' → verified
   * - Invitation with any other status → not verified
   */
  async getByUnitId(unitId: string, includeInactive = false): Promise<TUnitOwnership[]> {
    const results = await this.db
      .select({
        ownership: unitOwnerships,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phoneCountryCode: users.phoneCountryCode,
          phoneNumber: users.phoneNumber,
          idDocumentType: users.idDocumentType,
          idDocumentNumber: users.idDocumentNumber,
          displayName: users.displayName,
          photoUrl: users.photoUrl,
        },
      })
      .from(unitOwnerships)
      .leftJoin(users, eq(unitOwnerships.userId, users.id))
      .where(eq(unitOwnerships.unitId, unitId))

    const mapped = results.map(row => {
      const entity = this.mapToEntity(row.ownership)
      if (row.user?.email) {
        entity.user = {
          ...row.user,
          idDocumentType: row.user.idDocumentType as 'J' | 'G' | 'V' | 'E' | 'P' | null,
        } as TUnitOwnership['user']
      }
      return entity
    })

    // Derive isRegistered from user_invitations.status (matched by userId + unitId)
    const userIds = mapped.filter(o => o.userId).map(o => o.userId!)
    if (userIds.length > 0) {
      const invitations = await this.db
        .select({
          userId: userInvitations.userId,
          unitId: userInvitations.unitId,
          status: userInvitations.status,
        })
        .from(userInvitations)
        .where(
          and(
            inArray(userInvitations.userId, userIds),
            eq(userInvitations.unitId, unitId)
          )
        )

      // Build a map: userId → has any accepted invitation (by status)
      const invitationMap = new Map<string, boolean>()
      for (const inv of invitations) {
        if (inv.status === 'accepted') {
          invitationMap.set(inv.userId, true)
        } else if (!invitationMap.has(inv.userId)) {
          invitationMap.set(inv.userId, false)
        }
      }

      for (const ownership of mapped) {
        if (ownership.userId) {
          if (invitationMap.has(ownership.userId)) {
            ownership.isRegistered = invitationMap.get(ownership.userId)!
          } else {
            // No invitation = directly added user, always verified
            ownership.isRegistered = true
          }
        }
      }
    }

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
