import { buildingCreateSchema } from './createDto'

export const buildingUpdateSchema = buildingCreateSchema.partial()
