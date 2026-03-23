import { budgetItemCreateSchema } from './createDto'

export const budgetItemUpdateSchema = budgetItemCreateSchema.partial()
