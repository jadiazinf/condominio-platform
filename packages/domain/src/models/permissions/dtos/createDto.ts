import { permissionSchema } from '../schema'

export const permissionCreateSchema = permissionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
