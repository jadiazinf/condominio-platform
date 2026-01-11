import { quotaFormulaSchema } from '../schema'

export const quotaFormulaCreateSchema = quotaFormulaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
  updateReason: true,
})
