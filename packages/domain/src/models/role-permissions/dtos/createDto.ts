import { rolePermissionSchema } from '../schema'

export const rolePermissionCreateSchema = rolePermissionSchema.omit({
  id: true,
  createdAt: true,
  role: true,
  permission: true,
})
