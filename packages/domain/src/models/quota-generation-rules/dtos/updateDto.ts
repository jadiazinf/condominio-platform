import { quotaGenerationRuleSchema } from '../schema'

export const quotaGenerationRuleUpdateSchema = quotaGenerationRuleSchema
  .omit({
    id: true,
    condominiumId: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial()
