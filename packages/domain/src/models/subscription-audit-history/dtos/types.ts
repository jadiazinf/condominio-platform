import { z } from 'zod'
import { subscriptionAuditHistoryCreateSchema } from './createDto'

export type TSubscriptionAuditHistoryCreate = z.infer<typeof subscriptionAuditHistoryCreateSchema>
