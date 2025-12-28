import { z } from 'zod'
import { EExpenseStatuses, expenseSchema } from './schema'

export type TExpenseStatus = (typeof EExpenseStatuses)[number]

export type TExpense = z.infer<typeof expenseSchema>
