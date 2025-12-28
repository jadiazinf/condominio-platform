import { z } from 'zod'
import { EAuditActions, auditLogSchema } from './schema'

export type TAuditAction = (typeof EAuditActions)[number]

export type TAuditLog = z.infer<typeof auditLogSchema>
