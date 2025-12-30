import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { roleSchema } from '../roles/schema'
import { permissionSchema } from '../permissions/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.rolePermissions

export const rolePermissionSchema = z.object({
  id: z.uuid(),
  roleId: z.uuid({ error: d.roleId.invalid }),
  permissionId: z.uuid({ error: d.permissionId.invalid }),
  registeredBy: z.uuid({ error: d.registeredBy.invalid }).nullable(),
  createdAt: timestampField,
  // Relations
  role: roleSchema.optional(),
  permission: permissionSchema.optional(),
})
