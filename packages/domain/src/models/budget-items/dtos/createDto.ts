import { budgetItemSchema } from '../schema'

export const budgetItemCreateSchema = budgetItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
