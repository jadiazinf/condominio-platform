import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'
import { unitSchema } from '../units/schema'
import { paymentConceptSchema } from '../payment-concepts/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.quotas

export const EQuotaStatuses = ['pending', 'paid', 'overdue', 'cancelled'] as const

export const quotaSchema = baseModelSchema.extend({
  unitId: z.uuid({ error: d.unitId.invalid }),
  paymentConceptId: z.uuid({ error: d.paymentConceptId.invalid }),
  periodYear: z.number({ error: d.periodYear.required }).int({ error: d.periodYear.invalid }),
  periodMonth: z
    .number()
    .int()
    .min(1, { error: d.periodMonth.min })
    .max(12, { error: d.periodMonth.max })
    .nullable(),
  periodDescription: z.string().max(100).nullable(),
  baseAmount: z.string({ error: d.baseAmount.required }),
  currencyId: z.uuid({ error: d.currencyId.invalid }),
  interestAmount: z.string().default('0'),
  amountInBaseCurrency: z.string().nullable(),
  exchangeRateUsed: z.string().nullable(),
  issueDate: dateField,
  dueDate: dateField,
  status: z.enum(EQuotaStatuses, { error: d.status.invalid }).default('pending'),
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
