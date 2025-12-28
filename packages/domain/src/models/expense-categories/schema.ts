import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'

export const expenseCategoryBaseSchema = z.object({
  id: z.uuid(),
  name: z.string().max(100),
  description: z.string().nullable(),
  parentCategoryId: z.uuid().nullable(),
  isActive: z.boolean().default(true),
  registeredBy: z.uuid().nullable(),
  createdAt: timestampField,
})

export type TExpenseCategoryBase = z.infer<typeof expenseCategoryBaseSchema>

export const expenseCategorySchema: z.ZodType<
  TExpenseCategoryBase & { parentCategory?: TExpenseCategoryBase }
> = expenseCategoryBaseSchema.extend({
  parentCategory: z.lazy(() => expenseCategorySchema).optional(),
})
