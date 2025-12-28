import { z } from 'zod'
import { EOwnershipTypes, unitOwnershipSchema } from './schema'

export type TOwnershipType = (typeof EOwnershipTypes)[number]

export type TUnitOwnership = z.infer<typeof unitOwnershipSchema>
