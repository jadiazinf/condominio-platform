import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.bankReconciliations

export const EReconciliationStatuses = ['in_progress', 'completed', 'cancelled'] as const

export const bankReconciliationSchema = baseModelSchema.extend({
  bankAccountId: z.uuid({ error: d.bankAccountId.invalid }),
  condominiumId: z.uuid({ error: d.condominiumId.invalid }),
  periodFrom: z.coerce.date({ error: d.periodFrom.invalid }),
  periodTo: z.coerce.date({ error: d.periodTo.invalid }),
  status: z.enum(EReconciliationStatuses, { error: d.status.invalid }).default('in_progress'),
  totalMatched: z.number().int().default(0),
  totalUnmatched: z.number().int().default(0),
  totalIgnored: z.number().int().default(0),
  reconciledBy: z.uuid().nullable(),
  reconciledAt: timestampField.nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})
