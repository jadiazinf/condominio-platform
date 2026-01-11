import { quotaGenerationLogSchema } from '../schema'

// Generation logs are created by the system, not manually
export const quotaGenerationLogCreateSchema = quotaGenerationLogSchema.omit({
  id: true,
  generatedAt: true,
})
