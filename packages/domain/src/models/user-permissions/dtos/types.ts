import { z } from 'zod'
import { userPermissionCreateSchema } from './createDto'
import { userPermissionUpdateSchema } from './updateDto'

export type TUserPermissionCreate = z.infer<typeof userPermissionCreateSchema>
export type TUserPermissionUpdate = z.infer<typeof userPermissionUpdateSchema>
