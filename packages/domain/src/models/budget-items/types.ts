import { z } from 'zod'
import { budgetItemSchema } from './schema'

export type TBudgetItem = z.infer<typeof budgetItemSchema>
