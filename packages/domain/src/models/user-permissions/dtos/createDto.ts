import { userPermissionSchema } from '../schema'

export const userPermissionCreateSchema = userPermissionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  user: true,
  permission: true,
})
