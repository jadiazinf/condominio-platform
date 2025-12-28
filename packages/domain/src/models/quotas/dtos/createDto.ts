import { quotaSchema } from '../schema'

export const quotaCreateSchema = quotaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  unit: true,
  paymentConcept: true,
  currency: true,
  createdByUser: true,
})
