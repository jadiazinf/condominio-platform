import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.quotaGenerationLogs

export const EGenerationMethods = ['manual_single', 'manual_batch', 'scheduled', 'range'] as const
export const EGenerationStatuses = ['completed', 'partial', 'failed'] as const

export const quotaGenerationLogSchema = z.object({
  id: z.uuid(),
  generationRuleId: z.uuid({ error: d.generationRuleId.invalid }).nullish(),
  generationScheduleId: z.uuid({ error: d.generationScheduleId.invalid }).nullish(),
  quotaFormulaId: z.uuid({ error: d.quotaFormulaId.invalid }).nullish(),
  generationMethod: z.enum(EGenerationMethods, { error: d.generationMethod.invalid }),
  periodYear: z.number({ error: d.periodYear.required }).int(),
  periodMonth: z
    .number()
    .int()
    .min(1, { error: d.periodMonth.min })
    .max(12, { error: d.periodMonth.max })
    .nullish(),
  periodDescription: z.string().max(100).nullish(),
  quotasCreated: z.number().int().default(0),
  quotasFailed: z.number().int().default(0),
  totalAmount: z.string().nullish(),
  currencyId: z.uuid().nullish(),
  unitsAffected: z.array(z.uuid()).nullable(),
  parameters: z.record(z.string(), z.unknown()).nullable(),
  formulaSnapshot: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(EGenerationStatuses, { error: d.status.invalid }),
  errorDetails: z.string().nullish(),
  generatedBy: z.uuid({ error: d.generatedBy.invalid }),
  generatedAt: timestampField,
})
