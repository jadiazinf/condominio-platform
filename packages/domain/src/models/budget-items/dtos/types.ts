import { z } from 'zod'
import { budgetItemCreateSchema } from './createDto'
import { budgetItemUpdateSchema } from './updateDto'

export type TBudgetItemCreate = z.infer<typeof budgetItemCreateSchema>
export type TBudgetItemUpdate = z.infer<typeof budgetItemUpdateSchema>
