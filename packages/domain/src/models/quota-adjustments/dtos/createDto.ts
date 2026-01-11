import { quotaAdjustmentSchema } from '../schema'

export const quotaAdjustmentCreateSchema = quotaAdjustmentSchema.omit({
  id: true,
  createdAt: true,
  quota: true,
  createdByUser: true,
})
