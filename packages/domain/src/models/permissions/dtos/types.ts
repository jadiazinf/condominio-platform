import { z } from 'zod'
import { permissionCreateSchema } from './createDto'
import { permissionUpdateSchema } from './updateDto'

export type TPermissionCreate = z.infer<typeof permissionCreateSchema>
export type TPermissionUpdate = z.infer<typeof permissionUpdateSchema>
