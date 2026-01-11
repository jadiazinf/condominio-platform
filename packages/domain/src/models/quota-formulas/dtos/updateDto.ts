import { quotaFormulaSchema } from '../schema'

export const quotaFormulaUpdateSchema = quotaFormulaSchema
  .omit({
    id: true,
    condominiumId: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial()
