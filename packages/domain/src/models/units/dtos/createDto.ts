import { unitSchema } from '../schema'

export const unitCreateSchema = unitSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  building: true,
  createdByUser: true,
})
