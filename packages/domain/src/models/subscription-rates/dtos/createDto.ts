import { subscriptionRateSchema } from '../schema'

export const subscriptionRateCreateSchema = subscriptionRateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdByUser: true,
  updatedByUser: true,
})
