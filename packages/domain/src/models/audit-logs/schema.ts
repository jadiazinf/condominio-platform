import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.auditLogs

export const EAuditActions = ['INSERT', 'UPDATE', 'DELETE'] as const

export const auditLogSchema = z.object({
  id: z.uuid(),
  tableName: z
    .string({ error: d.tableName.required })
    .max(100, { error: d.tableName.max }),
  recordId: z.uuid({ error: d.recordId.invalid }),
  action: z.enum(EAuditActions, { error: d.action.invalid }),
  oldValues: z.record(z.string(), z.unknown()).nullable(),
  newValues: z.record(z.string(), z.unknown()).nullable(),
  changedFields: z.array(z.string()).nullable(),
  userId: z.uuid({ error: d.userId.invalid }).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: timestampField,
  // Relations
  user: userSchema.optional(),
})
