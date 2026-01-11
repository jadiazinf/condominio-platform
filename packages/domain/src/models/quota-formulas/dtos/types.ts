import { z } from 'zod'
import { quotaFormulaCreateSchema } from './createDto'
import { quotaFormulaUpdateSchema } from './updateDto'

export type TQuotaFormulaCreate = z.infer<typeof quotaFormulaCreateSchema>
export type TQuotaFormulaUpdate = z.infer<typeof quotaFormulaUpdateSchema>
