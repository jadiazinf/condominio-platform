import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'
import { unitSchema } from '../units/schema'
import { paymentConceptSchema } from '../payment-concepts/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'

export const EQuotaStatuses = ['pending', 'paid', 'overdue', 'cancelled'] as const

export const quotaSchema = baseModelSchema.extend({
  unitId: z.uuid(),
  paymentConceptId: z.uuid(),
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12).nullable(),
  periodDescription: z.string().max(100).nullable(),
  baseAmount: z.string(),
  currencyId: z.uuid(),
  interestAmount: z.string().default('0'),
  amountInBaseCurrency: z.string().nullable(),
  exchangeRateUsed: z.string().nullable(),
  issueDate: dateField,
  dueDate: dateField,
  status: z.enum(EQuotaStatuses).default('pending'),
  paidAmount: z.string().default('0'),
  balance: z.string(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  unit: unitSchema.optional(),
  paymentConcept: paymentConceptSchema.optional(),
  currency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})
