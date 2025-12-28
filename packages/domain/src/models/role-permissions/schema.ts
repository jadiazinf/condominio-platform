import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { roleSchema } from '../roles/schema'
import { permissionSchema } from '../permissions/schema'

export const rolePermissionSchema = z.object({
  id: z.uuid(),
  roleId: z.uuid(),
  permissionId: z.uuid(),
  registeredBy: z.uuid().nullable(),
  createdAt: timestampField,
  // Relations
  role: roleSchema.optional(),
  permission: permissionSchema.optional(),
})
