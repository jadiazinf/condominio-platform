import { managementCompanySubscriptionSchema } from '../schema'

export const managementCompanySubscriptionCreateSchema = managementCompanySubscriptionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  managementCompany: true,
  currency: true,
  createdByUser: true,
  cancelledByUser: true,
})
