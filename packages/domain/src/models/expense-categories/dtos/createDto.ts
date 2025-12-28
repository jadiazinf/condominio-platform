import { expenseCategoryBaseSchema } from '../schema'

export const expenseCategoryCreateSchema = expenseCategoryBaseSchema.omit({
  id: true,
  createdAt: true,
})
