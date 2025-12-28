import { roleSchema } from '../schema'

export const roleCreateSchema = roleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
