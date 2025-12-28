import { z } from 'zod'
import { buildingCreateSchema } from './createDto'
import { buildingUpdateSchema } from './updateDto'

export type TBuildingCreate = z.infer<typeof buildingCreateSchema>
export type TBuildingUpdate = z.infer<typeof buildingUpdateSchema>
