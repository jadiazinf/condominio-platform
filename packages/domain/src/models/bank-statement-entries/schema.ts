import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.bankStatementEntries

export const EBankStatementEntryTypes = ['credit', 'debit'] as const
export const EBankStatementEntryStatuses = ['unmatched', 'matched', 'ignored'] as const

export const bankStatementEntrySchema = baseModelSchema.extend({
  importId: z.uuid({ error: d.importId.invalid }),
  transactionDate: z.coerce.date({ error: d.transactionDate.invalid }),
  valueDate: z.coerce.date().nullable(),
  reference: z.string().max(255, { error: d.reference.max }).nullable(),
  description: z.string().nullable(),
  amount: z.string({ error: d.amount.required }),
  entryType: z.enum(EBankStatementEntryTypes, { error: d.entryType.invalid }),
  balance: z.string().nullable(),
  status: z.enum(EBankStatementEntryStatuses, { error: d.status.invalid }).default('unmatched'),
  matchedAt: timestampField.nullable(),
  rawData: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})
