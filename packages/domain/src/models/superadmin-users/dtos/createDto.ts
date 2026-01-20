import { superadminUserSchema } from '../schema'

export const superadminUserCreateSchema = superadminUserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastAccessAt: true,
})
