import { z } from 'zod'
import { expenseCreateSchema } from './createDto'
import { expenseUpdateSchema } from './updateDto'

export type TExpenseCreate = z.infer<typeof expenseCreateSchema>
export type TExpenseUpdate = z.infer<typeof expenseUpdateSchema>
