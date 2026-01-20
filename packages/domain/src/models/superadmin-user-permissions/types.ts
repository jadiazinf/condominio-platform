import { z } from 'zod'
import { superadminUserPermissionSchema } from './schema'

export type TSuperadminUserPermission = z.infer<typeof superadminUserPermissionSchema>
