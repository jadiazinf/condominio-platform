import { expenseCreateSchema } from './createDto'

export const expenseUpdateSchema = expenseCreateSchema.partial()
