import { z } from 'zod'
import { budgetCreateSchema } from './createDto'
import { budgetUpdateSchema } from './updateDto'

export type TBudgetCreate = z.infer<typeof budgetCreateSchema>
export type TBudgetUpdate = z.infer<typeof budgetUpdateSchema>
