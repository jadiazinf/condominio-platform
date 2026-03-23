import { z } from 'zod'
import { EBudgetStatuses, EBudgetTypes, budgetSchema } from './schema'

export type TBudgetStatus = (typeof EBudgetStatuses)[number]
export type TBudgetType = (typeof EBudgetTypes)[number]
export type TBudget = z.infer<typeof budgetSchema>
