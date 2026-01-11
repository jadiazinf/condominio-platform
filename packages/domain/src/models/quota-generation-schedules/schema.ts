import { z } from 'zod'
import { timestampField, dateField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.quotaGenerationSchedules

export const EFrequencyTypes = ['days', 'monthly', 'quarterly', 'semi_annual', 'annual'] as const

export const quotaGenerationScheduleSchema = z.object({
  id: z.uuid(),
  quotaGenerationRuleId: z.uuid({ error: d.quotaGenerationRuleId.invalid }),
  name: z.string({ error: d.name.required }).max(255, { error: d.name.max }),
  frequencyType: z.enum(EFrequencyTypes, { error: d.frequencyType.invalid }),
  frequencyValue: z.number().int().min(1, { error: d.frequencyValue.min }).nullish(),
  generationDay: z
    .number({ error: d.generationDay.required })
    .int()
    .min(1, { error: d.generationDay.min })
    .max(28, { error: d.generationDay.max }),
  periodsInAdvance: z.number().int().min(1, { error: d.periodsInAdvance.min }).default(1),
  issueDay: z
    .number({ error: d.issueDay.required })
    .int()
    .min(1, { error: d.issueDay.min })
    .max(28, { error: d.issueDay.max }),
  dueDay: z
    .number({ error: d.dueDay.required })
    .int()
    .min(1, { error: d.dueDay.min })
    .max(28, { error: d.dueDay.max }),
  graceDays: z.number().int().min(0, { error: d.graceDays.min }).default(0),
  isActive: z.boolean().default(true),
  lastGeneratedPeriod: z.string().max(20).nullish(),
  lastGeneratedAt: timestampField.nullish(),
  nextGenerationDate: dateField.nullish(),
  createdBy: z.uuid({ error: d.createdBy.invalid }),
  createdAt: timestampField,
  updatedBy: z.uuid({ error: d.updatedBy.invalid }).nullish(),
  updatedAt: timestampField,
  updateReason: z.string().nullish(),
})
