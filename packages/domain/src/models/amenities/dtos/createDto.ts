import { amenitySchema } from '../schema'

export const amenityCreateSchema = amenitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
