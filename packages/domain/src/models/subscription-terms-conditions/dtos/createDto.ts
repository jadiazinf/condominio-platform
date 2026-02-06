import { subscriptionTermsConditionsSchema } from '../schema'

export const subscriptionTermsConditionsCreateSchema = subscriptionTermsConditionsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdByUser: true,
})
