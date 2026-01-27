import { subscriptionInvoiceSchema } from '../schema'

export const subscriptionInvoiceCreateSchema = subscriptionInvoiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  subscription: true,
  managementCompany: true,
  currency: true,
})
