import { z } from 'zod'
import { expenseCategoryCreateSchema } from './createDto'
import { expenseCategoryUpdateSchema } from './updateDto'

export type TExpenseCategoryCreate = z.infer<typeof expenseCategoryCreateSchema>
export type TExpenseCategoryUpdate = z.infer<typeof expenseCategoryUpdateSchema>
