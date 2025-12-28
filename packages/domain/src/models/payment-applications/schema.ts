import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { paymentSchema } from '../payments/schema'
import { quotaSchema } from '../quotas/schema'

export const paymentApplicationSchema = z.object({
  id: z.uuid(),
  paymentId: z.uuid(),
  quotaId: z.uuid(),
  appliedAmount: z.string(),
  appliedToPrincipal: z.string().default('0'),
  appliedToInterest: z.string().default('0'),
  registeredBy: z.uuid().nullable(),
  appliedAt: timestampField,
  // Relations
  payment: paymentSchema.optional(),
  quota: quotaSchema.optional(),
})
