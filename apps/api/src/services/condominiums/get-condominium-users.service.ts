import { eq, and } from 'drizzle-orm'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  users,
  userRoles,
  roles,
  unitOwnerships,
  units,
  buildings,
} from '@database/drizzle/schema'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetCondominiumUsersInput {
  condominiumId: string
}

export interface ICondominiumUserRole {
  id: string
  roleId: string
  roleName: string
  isActive: boolean
  assignedAt: Date
}

export interface ICondominiumUserUnit {
  id: string
  unitId: string
  unitNumber: string
  buildingId: string
  buildingName: string
  ownershipType: 'owner' | 'co-owner' | 'tenant' | 'family_member' | 'authorized'
  isActive: boolean
}

export interface ICondominiumUser {
  id: string
  firebaseUid: string | null
  email: string
  displayName: string | null
  phoneCountryCode: string | null
  phoneNumber: string | null
  photoUrl: string | null
  firstName: string | null
  lastName: string | null
  idDocumentType: string | null
  idDocumentNumber: string | null
  address: string | null
  locationId: string | null
  preferredLanguage: string | null
  preferredCurrencyId: string | null
  isActive: boolean
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
  roles: ICondominiumUserRole[]
  units: ICondominiumUserUnit[]
}

/**
 * Service to get all users associated with a condominium
 * including their roles and unit ownerships.
 */
export class GetCondominiumUsersService {
  constructor(private readonly db: TDrizzleClient) {}

  async execute(input: IGetCondominiumUsersInput): Promise<TServiceResult<ICondominiumUser[]>> {
    const { condominiumId } = input

    try {
      // Get all users who have roles in this condominium
      const usersWithRoles = await this.db
        .select({
          userId: users.id,
          firebaseUid: users.firebaseUid,
          email: users.email,
          displayName: users.displayName,
          phoneCountryCode: users.phoneCountryCode,
          phoneNumber: users.phoneNumber,
          photoUrl: users.photoUrl,
          firstName: users.firstName,
          lastName: users.lastName,
          idDocumentType: users.idDocumentType,
          idDocumentNumber: users.idDocumentNumber,
          address: users.address,
          locationId: users.locationId,
          preferredLanguage: users.preferredLanguage,
          preferredCurrencyId: users.preferredCurrencyId,
          isActive: users.isActive,
          metadata: users.metadata,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          userRoleId: userRoles.id,
          roleId: roles.id,
          roleName: roles.name,
          userRoleIsActive: userRoles.isActive,
          assignedAt: userRoles.assignedAt,
        })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(
          and(
            eq(userRoles.condominiumId, condominiumId),
            eq(users.isActive, true)
          )
        )

      // Get all unit ownerships for these users in this condominium
      const userIds = [...new Set(usersWithRoles.map(u => u.userId))]

      let unitOwnershipsData: Array<{
        userId: string | null
        ownershipId: string
        unitId: string
        unitNumber: string
        buildingId: string
        buildingName: string
        ownershipType: 'owner' | 'co-owner' | 'tenant' | 'family_member' | 'authorized'
        isActive: boolean
      }> = []

      if (userIds.length > 0) {
        const rawOwnerships = await this.db
          .select({
            userId: unitOwnerships.userId,
            ownershipId: unitOwnerships.id,
            unitId: units.id,
            unitNumber: units.unitNumber,
            buildingId: buildings.id,
            buildingName: buildings.name,
            ownershipType: unitOwnerships.ownershipType,
            isActive: unitOwnerships.isActive,
          })
          .from(unitOwnerships)
          .innerJoin(units, eq(units.id, unitOwnerships.unitId))
          .innerJoin(buildings, eq(buildings.id, units.buildingId))
          .where(
            and(
              eq(buildings.condominiumId, condominiumId),
              eq(unitOwnerships.isActive, true)
            )
          )

        // Map to ensure isActive is always boolean
        unitOwnershipsData = rawOwnerships.map(o => ({
          ...o,
          isActive: o.isActive ?? true,
        }))
      }

      // Group by user
      const userMap = new Map<string, ICondominiumUser>()

      for (const row of usersWithRoles) {
        if (!userMap.has(row.userId)) {
          userMap.set(row.userId, {
            id: row.userId,
            firebaseUid: row.firebaseUid,
            email: row.email,
            displayName: row.displayName,
            phoneCountryCode: row.phoneCountryCode,
            phoneNumber: row.phoneNumber,
            photoUrl: row.photoUrl,
            firstName: row.firstName,
            lastName: row.lastName,
            idDocumentType: row.idDocumentType,
            idDocumentNumber: row.idDocumentNumber,
            address: row.address,
            locationId: row.locationId,
            preferredLanguage: row.preferredLanguage,
            preferredCurrencyId: row.preferredCurrencyId,
            isActive: row.isActive ?? true,
            metadata: row.metadata as Record<string, unknown> | null,
            createdAt: row.createdAt ?? new Date(),
            updatedAt: row.updatedAt ?? new Date(),
            roles: [],
            units: [],
          })
        }

        const user = userMap.get(row.userId)!
        user.roles.push({
          id: row.userRoleId,
          roleId: row.roleId,
          roleName: row.roleName,
          isActive: row.userRoleIsActive ?? true,
          assignedAt: row.assignedAt ?? new Date(),
        })
      }

      // Add unit ownerships to users (skip non-registered residents with null userId)
      for (const ownership of unitOwnershipsData) {
        if (!ownership.userId) continue
        const user = userMap.get(ownership.userId)
        if (user) {
          user.units.push({
            id: ownership.ownershipId,
            unitId: ownership.unitId,
            unitNumber: ownership.unitNumber,
            buildingId: ownership.buildingId,
            buildingName: ownership.buildingName,
            ownershipType: ownership.ownershipType,
            isActive: ownership.isActive ?? true,
          })
        }
      }

      return success(Array.from(userMap.values()))
    } catch (error) {
      return failure(
        `Failed to get condominium users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INTERNAL_ERROR'
      )
    }
  }
}
