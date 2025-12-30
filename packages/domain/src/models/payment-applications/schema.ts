import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { paymentSchema } from '../payments/schema'
import { quotaSchema } from '../quotas/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.paymentApplications

export const paymentApplicationSchema = z.object({
  id: z.uuid(),
  paymentId: z.uuid({ error: d.paymentId.invalid }),
  quotaId: z.uuid({ error: d.quotaId.invalid }),
  appliedAmount: z.string({ error: d.appliedAmount.required }),
  appliedToPrincipal: z.string().default('0'),
  appliedToInterest: z.string().default('0'),
  registeredBy: z.uuid({ error: d.registeredBy.invalid }).nullable(),
  appliedAt: timestampField,
  // Relations
  payment: paymentSchema.optional(),
  quota: quotaSchema.optional(),
})
