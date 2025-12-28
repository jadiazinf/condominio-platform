import { z } from 'zod'
import { roleCreateSchema } from './createDto'
import { roleUpdateSchema } from './updateDto'

export type TRoleCreate = z.infer<typeof roleCreateSchema>
export type TRoleUpdate = z.infer<typeof roleUpdateSchema>
