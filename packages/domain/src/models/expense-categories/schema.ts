import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.expenseCategories

export const expenseCategoryBaseSchema = z.object({
  id: z.uuid(),
  name: z
    .string({ error: d.name.required })
    .max(100, { error: d.name.max }),
  description: z.string().nullable(),
  parentCategoryId: z.uuid({ error: d.parentCategoryId.invalid }).nullable(),
  isActive: z.boolean().default(true),
  registeredBy: z.uuid({ error: d.registeredBy.invalid }).nullable(),
  createdAt: timestampField,
})

export type TExpenseCategoryBase = z.infer<typeof expenseCategoryBaseSchema>

export const expenseCategorySchema: z.ZodType<
  TExpenseCategoryBase & { parentCategory?: TExpenseCategoryBase }
> = expenseCategoryBaseSchema.extend({
  parentCategory: z.lazy(() => expenseCategorySchema).optional(),
})
