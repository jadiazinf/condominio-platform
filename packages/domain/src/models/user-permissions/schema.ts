import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { permissionSchema } from '../permissions/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.userPermissions

export const userPermissionSchema = z.object({
  id: z.uuid(),
  userId: z.uuid({ error: d.userId.invalid }),
  permissionId: z.uuid({ error: d.permissionId.invalid }),
  isEnabled: z.boolean({ error: d.isEnabled.invalid }),
  assignedBy: z.uuid({ error: d.assignedBy.invalid }).nullable(),
  createdAt: timestampField,
  updatedAt: timestampField,
  // Relations
  user: userSchema.optional(),
  permission: permissionSchema.optional(),
})
