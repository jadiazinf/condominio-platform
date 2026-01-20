import { z } from 'zod'
import { superadminUserCreateSchema } from './createDto'
import { superadminUserUpdateSchema } from './updateDto'

export type TSuperadminUserCreate = z.infer<typeof superadminUserCreateSchema>
export type TSuperadminUserUpdate = z.infer<typeof superadminUserUpdateSchema>
