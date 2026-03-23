import { budgetCreateSchema } from './createDto'

export const budgetUpdateSchema = budgetCreateSchema.partial()
