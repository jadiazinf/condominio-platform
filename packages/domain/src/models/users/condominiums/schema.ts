import { z } from 'zod'
import { condominiumSchema } from '../../condominiums/schema'
import { roleSchema } from '../../roles/schema'
import { unitOwnershipSchema } from '../../unit-ownerships/schema'
import { unitSchema } from '../../units/schema'
import { buildingSchema } from '../../buildings/schema'

/**
 * Represents a user's access to a condominium with their roles and units
 */
export const userCondominiumAccessSchema = z.object({
  condominium: condominiumSchema.pick({
    id: true,
    name: true,
    code: true,
    address: true,
    isActive: true,
  }),
  roles: z.array(
    roleSchema.pick({
      id: true,
      name: true,
      description: true,
      isSystemRole: true,
    })
  ),
  units: z.array(
    z.object({
      ownership: unitOwnershipSchema.pick({
        id: true,
        ownershipType: true,
        isPrimaryResidence: true,
        isActive: true,
      }),
      unit: unitSchema.pick({
        id: true,
        unitNumber: true,
        floor: true,
      }),
      building: buildingSchema.pick({
        id: true,
        name: true,
        code: true,
      }),
    })
  ),
})

/**
 * Response schema for GET /users/me/condominiums
 */
export const userCondominiumsResponseSchema = z.object({
  condominiums: z.array(userCondominiumAccessSchema),
  total: z.number(),
})
