import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.budgets

export const EBudgetStatuses = ['draft', 'approved', 'active', 'closed'] as const
export const EBudgetTypes = ['monthly', 'quarterly', 'annual'] as const

export const budgetSchema = baseModelSchema.extend({
  condominiumId: z.uuid({ error: d.condominiumId.invalid }),
  name: z.string({ error: d.name.required }).max(255, { error: d.name.max }),
  description: z.string().nullable(),
  budgetType: z.enum(EBudgetTypes, { error: d.budgetType.invalid }).default('monthly'),
  periodYear: z.number({ error: d.periodYear.required }).int({ error: d.periodYear.invalid }),
  periodMonth: z
    .number()
    .int()
    .min(1, { error: d.periodMonth.min })
    .max(12, { error: d.periodMonth.max })
    .nullable(),
  currencyId: z.uuid({ error: d.currencyId.invalid }),
  status: z.enum(EBudgetStatuses, { error: d.status.invalid }).default('draft'),
  totalAmount: z.string().default('0'),
  reserveFundPercentage: z.string().nullable().default('0'),
  approvedBy: z.uuid().nullable(),
  approvedAt: timestampField.nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
})
