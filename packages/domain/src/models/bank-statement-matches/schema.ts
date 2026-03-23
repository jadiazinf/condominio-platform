import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.bankStatementMatches

export const EMatchTypes = ['auto_reference', 'auto_amount_date', 'manual'] as const

export const bankStatementMatchSchema = baseModelSchema.omit({ updatedAt: true }).extend({
  entryId: z.uuid({ error: d.entryId.invalid }),
  paymentId: z.uuid({ error: d.paymentId.invalid }),
  matchType: z.enum(EMatchTypes, { error: d.matchType.invalid }),
  confidence: z.string().nullable(),
  matchedBy: z.uuid().nullable(),
  notes: z.string().nullable(),
})
