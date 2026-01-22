import { eq } from 'drizzle-orm'
import type { TUserCondominiumsResponse, TUserCondominiumAccess } from '@packages/domain'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  unitOwnerships,
  units,
  buildings,
  condominiums,
  userRoles,
  roles,
} from '@database/drizzle/schema'
import { type TServiceResult, success } from '../base.service'

export interface IGetUserCondominiumsInput {
  userId: string
}

/**
 * Service for retrieving all condominiums a user has access to.
 * This includes condominiums where the user:
 * - Owns or rents a unit (via unit_ownerships)
 * - Has a role assigned (via user_roles)
 */
export class GetUserCondominiumsService {
  constructor(private readonly db: TDrizzleClient) {}

  async execute(
    input: IGetUserCondominiumsInput
  ): Promise<TServiceResult<TUserCondominiumsResponse>> {
    const { userId } = input

    // Get all unit ownerships with their related data
    const ownershipResults = await this.db
      .select({
        ownership: {
          id: unitOwnerships.id,
          ownershipType: unitOwnerships.ownershipType,
          isPrimaryResidence: unitOwnerships.isPrimaryResidence,
          isActive: unitOwnerships.isActive,
        },
        unit: {
          id: units.id,
          unitNumber: units.unitNumber,
          floor: units.floor,
        },
        building: {
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          condominiumId: buildings.condominiumId,
        },
        condominium: {
          id: condominiums.id,
          name: condominiums.name,
          code: condominiums.code,
          address: condominiums.address,
          isActive: condominiums.isActive,
        },
      })
      .from(unitOwnerships)
      .innerJoin(units, eq(unitOwnerships.unitId, units.id))
      .innerJoin(buildings, eq(units.buildingId, buildings.id))
      .innerJoin(condominiums, eq(buildings.condominiumId, condominiums.id))
      .where(eq(unitOwnerships.userId, userId))

    // Get all user roles with their related data
    const roleResults = await this.db
      .select({
        userRole: {
          condominiumId: userRoles.condominiumId,
        },
        role: {
          id: roles.id,
          name: roles.name,
          description: roles.description,
          isSystemRole: roles.isSystemRole,
        },
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId))

    // Get condominiums from roles that don't have unit ownerships
    const condominiumIdsFromOwnerships = new Set(ownershipResults.map(r => r.condominium.id))

    const roleCondominiumIds = roleResults
      .filter(
        r => r.userRole.condominiumId && !condominiumIdsFromOwnerships.has(r.userRole.condominiumId)
      )
      .map(r => r.userRole.condominiumId!)

    // Fetch additional condominiums from roles
    let additionalCondominiums: Array<{
      id: string
      name: string
      code: string | null
      address: string | null
      isActive: boolean | null
    }> = []

    if (roleCondominiumIds.length > 0) {
      const uniqueCondominiumIds = [...new Set(roleCondominiumIds)]
      for (const condominiumId of uniqueCondominiumIds) {
        const result = await this.db
          .select({
            id: condominiums.id,
            name: condominiums.name,
            code: condominiums.code,
            address: condominiums.address,
            isActive: condominiums.isActive,
          })
          .from(condominiums)
          .where(eq(condominiums.id, condominiumId))
          .limit(1)

        if (result[0]) {
          additionalCondominiums.push(result[0])
        }
      }
    }

    // Build the response by grouping data by condominium
    const condominiumMap = new Map<string, TUserCondominiumAccess>()

    // Process ownership results
    for (const row of ownershipResults) {
      const condominiumId = row.condominium.id

      if (!condominiumMap.has(condominiumId)) {
        condominiumMap.set(condominiumId, {
          condominium: {
            id: row.condominium.id,
            name: row.condominium.name,
            code: row.condominium.code,
            address: row.condominium.address ?? '',
            isActive: row.condominium.isActive ?? true,
          },
          roles: [],
          units: [],
        })
      }

      const access = condominiumMap.get(condominiumId)!

      // Add unit if not already present
      const unitExists = access.units.some(u => u.ownership.id === row.ownership.id)
      if (!unitExists) {
        access.units.push({
          ownership: {
            id: row.ownership.id,
            ownershipType: row.ownership.ownershipType as 'owner' | 'co-owner' | 'tenant',
            isPrimaryResidence: row.ownership.isPrimaryResidence ?? false,
            isActive: row.ownership.isActive ?? true,
          },
          unit: {
            id: row.unit.id,
            unitNumber: row.unit.unitNumber,
            floor: row.unit.floor,
          },
          building: {
            id: row.building.id,
            name: row.building.name,
            code: row.building.code,
          },
        })
      }
    }

    // Process additional condominiums from roles (without unit ownerships)
    for (const condo of additionalCondominiums) {
      if (!condominiumMap.has(condo.id)) {
        condominiumMap.set(condo.id, {
          condominium: {
            id: condo.id,
            name: condo.name,
            code: condo.code,
            address: condo.address ?? '',
            isActive: condo.isActive ?? true,
          },
          roles: [],
          units: [],
        })
      }
    }

    // Add roles to each condominium
    for (const row of roleResults) {
      const condominiumId = row.userRole.condominiumId
      if (!condominiumId) continue

      const access = condominiumMap.get(condominiumId)
      if (!access) continue

      // Add role if not already present
      const roleExists = access.roles.some(r => r.id === row.role.id)
      if (!roleExists) {
        access.roles.push({
          id: row.role.id,
          name: row.role.name,
          description: row.role.description ?? '',
          isSystemRole: row.role.isSystemRole ?? false,
        })
      }
    }

    // Convert map to array and filter only active condominiums
    const condominiumsList = Array.from(condominiumMap.values()).filter(
      access => access.condominium.isActive
    )

    return success({
      condominiums: condominiumsList,
      total: condominiumsList.length,
    })
  }
}
