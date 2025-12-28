import { z } from 'zod'
import { rolePermissionSchema } from './schema'

export type TRolePermission = z.infer<typeof rolePermissionSchema>
