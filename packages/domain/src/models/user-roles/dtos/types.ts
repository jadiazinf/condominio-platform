import { z } from 'zod'
import { userRoleCreateSchema } from './createDto'
import { userRoleUpdateSchema } from './updateDto'

export type TUserRoleCreate = z.infer<typeof userRoleCreateSchema>
export type TUserRoleUpdate = z.infer<typeof userRoleUpdateSchema>
