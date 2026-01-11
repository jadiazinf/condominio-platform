import { quotaGenerationRuleSchema } from '../schema'

export const quotaGenerationRuleCreateSchema = quotaGenerationRuleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
  updateReason: true,
})
