import { z } from 'zod'
import { superadminUserPermissionCreateSchema } from './createDto'

export type TSuperadminUserPermissionCreate = z.infer<typeof superadminUserPermissionCreateSchema>
