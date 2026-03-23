import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.budgetItems

export const budgetItemSchema = baseModelSchema.extend({
  budgetId: z.uuid({ error: d.budgetId.invalid }),
  expenseCategoryId: z.uuid().nullable(),
  description: z.string({ error: d.description.required }).max(255, { error: d.description.max }),
  budgetedAmount: z.string({ error: d.budgetedAmount.required }),
  notes: z.string().nullable(),
})
