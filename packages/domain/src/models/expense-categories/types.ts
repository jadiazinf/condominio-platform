import { z } from 'zod'
import { expenseCategorySchema } from './schema'

export type TExpenseCategory = z.infer<typeof expenseCategorySchema>
