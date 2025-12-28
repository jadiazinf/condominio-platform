import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'

export const EAuditActions = ['INSERT', 'UPDATE', 'DELETE'] as const

export const auditLogSchema = z.object({
  id: z.uuid(),
  tableName: z.string().max(100),
  recordId: z.uuid(),
  action: z.enum(EAuditActions),
  oldValues: z.record(z.string(), z.unknown()).nullable(),
  newValues: z.record(z.string(), z.unknown()).nullable(),
  changedFields: z.array(z.string()).nullable(),
  userId: z.uuid().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: timestampField,
  // Relations
  user: userSchema.optional(),
})
