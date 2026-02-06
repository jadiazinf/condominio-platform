import { subscriptionAcceptanceSchema } from '../schema'

export const subscriptionAcceptanceCreateSchema = subscriptionAcceptanceSchema.omit({
  id: true,
  createdAt: true,
  subscription: true,
  termsConditions: true,
  acceptedByUser: true,
})
