import { paymentSchema } from '../schema'

export const paymentCreateSchema = paymentSchema.omit({
  id: true,
  registeredAt: true,
  createdAt: true,
  updatedAt: true,
  user: true,
  unit: true,
  currency: true,
  paidCurrency: true,
  paymentGateway: true,
  registeredByUser: true,
})
