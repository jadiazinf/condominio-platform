import { auditLogSchema } from '../schema'

export const auditLogCreateSchema = auditLogSchema.omit({
  id: true,
  createdAt: true,
  user: true,
})
