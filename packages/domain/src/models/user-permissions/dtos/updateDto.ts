import { userPermissionCreateSchema } from './createDto'

export const userPermissionUpdateSchema = userPermissionCreateSchema.partial()
