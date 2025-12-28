import { z } from 'zod'
import { rolePermissionCreateSchema } from './createDto'
import { rolePermissionUpdateSchema } from './updateDto'

export type TRolePermissionCreate = z.infer<typeof rolePermissionCreateSchema>
export type TRolePermissionUpdate = z.infer<typeof rolePermissionUpdateSchema>
