import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.bankStatementImports

export const EBankStatementImportStatuses = ['processing', 'completed', 'failed'] as const

export const bankStatementImportSchema = baseModelSchema.extend({
  bankAccountId: z.uuid({ error: d.bankAccountId.invalid }),
  filename: z.string({ error: d.filename.required }).max(255, { error: d.filename.max }),
  importedBy: z.uuid().nullable(),
  periodFrom: z.coerce.date({ error: d.periodFrom.invalid }),
  periodTo: z.coerce.date({ error: d.periodTo.invalid }),
  totalEntries: z.number().int().default(0),
  totalCredits: z.string().default('0'),
  totalDebits: z.string().default('0'),
  status: z.enum(EBankStatementImportStatuses, { error: d.status.invalid }).default('processing'),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})
