import { z } from 'zod'
import { unitOwnershipCreateSchema } from './createDto'
import { unitOwnershipUpdateSchema } from './updateDto'

export type TUnitOwnershipCreate = z.infer<typeof unitOwnershipCreateSchema>
export type TUnitOwnershipUpdate = z.infer<typeof unitOwnershipUpdateSchema>
