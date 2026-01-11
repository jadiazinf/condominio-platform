import { quotaGenerationScheduleSchema } from '../schema'

export const quotaGenerationScheduleCreateSchema = quotaGenerationScheduleSchema.omit({
  id: true,
  lastGeneratedPeriod: true,
  lastGeneratedAt: true,
  nextGenerationDate: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
  updateReason: true,
})
