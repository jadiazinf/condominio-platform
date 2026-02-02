import { z } from 'zod'
import { userPermissionSchema } from './schema'

export type TUserPermission = z.infer<typeof userPermissionSchema>
