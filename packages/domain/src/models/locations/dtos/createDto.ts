import { locationBaseSchema } from '../schema'

export const locationCreateSchema = locationBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
