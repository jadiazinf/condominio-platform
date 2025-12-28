import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { roleSchema } from '../roles/schema'

export const userRoleSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  roleId: z.uuid(),
  condominiumId: z.uuid().nullable(),
  buildingId: z.uuid().nullable(),
  assignedAt: timestampField,
  assignedBy: z.uuid().nullable(),
  registeredBy: z.uuid().nullable(),
  expiresAt: timestampField.nullable(),
  // Relations
  user: userSchema.optional(),
  role: roleSchema.optional(),
  assignedByUser: userSchema.optional(),
})
