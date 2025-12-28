import { userRoleSchema } from '../schema'

export const userRoleCreateSchema = userRoleSchema.omit({
  id: true,
  assignedAt: true,
  user: true,
  role: true,
  assignedByUser: true,
})
