import { z } from 'zod'
import { userCreateSchema } from './createDto'
import { userUpdateSchema } from './updateDto'

export type TUserCreate = z.infer<typeof userCreateSchema>
export type TUserUpdate = z.infer<typeof userUpdateSchema>
