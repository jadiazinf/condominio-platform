import { subscriptionAuditHistorySchema } from '../schema'

export const subscriptionAuditHistoryCreateSchema = subscriptionAuditHistorySchema.omit({
  id: true,
  subscription: true,
  performedByUser: true,
})
