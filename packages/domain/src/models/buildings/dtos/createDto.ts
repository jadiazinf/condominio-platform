import { buildingSchema } from '../schema'

export const buildingCreateSchema = buildingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  condominium: true,
  createdByUser: true,
})
