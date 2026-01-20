import { superadminUserPermissionSchema } from '../schema'

export const superadminUserPermissionCreateSchema = superadminUserPermissionSchema.omit({
  id: true,
  createdAt: true,
})
