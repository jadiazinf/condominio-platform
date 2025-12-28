import { expenseCategoryCreateSchema } from './createDto'

export const expenseCategoryUpdateSchema = expenseCategoryCreateSchema.partial()
