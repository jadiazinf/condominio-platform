import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { roleSchema } from '../roles/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.userRoles

export const userRoleSchema = z.object({
  id: z.uuid(),
  userId: z.uuid({ error: d.userId.invalid }),
  roleId: z.uuid({ error: d.roleId.invalid }),
  condominiumId: z.uuid({ error: d.condominiumId.invalid }).nullable(),
  buildingId: z.uuid({ error: d.buildingId.invalid }).nullable(),
  managementCompanyId: z.uuid().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().nullable(),
  assignedAt: timestampField,
  assignedBy: z.uuid({ error: d.assignedBy.invalid }).nullable(),
  registeredBy: z.uuid({ error: d.registeredBy.invalid }).nullable(),
  expiresAt: timestampField.nullable(),
  // Relations
  user: userSchema.optional(),
  role: roleSchema.optional(),
  assignedByUser: userSchema.optional(),
})
