import { z } from 'zod'
import { auditLogCreateSchema } from './createDto'

export type TAuditLogCreate = z.infer<typeof auditLogCreateSchema>
