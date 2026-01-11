import { quotaGenerationScheduleSchema } from '../schema'

export const quotaGenerationScheduleUpdateSchema = quotaGenerationScheduleSchema
  .omit({
    id: true,
    quotaGenerationRuleId: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial()
