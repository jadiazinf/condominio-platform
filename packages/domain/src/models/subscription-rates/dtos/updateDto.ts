import { subscriptionRateSchema } from '../schema'

export const subscriptionRateUpdateSchema = subscriptionRateSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdByUser: true,
    updatedByUser: true,
    createdBy: true,
    version: true, // Version should not be changed after creation
  })
  .partial()
