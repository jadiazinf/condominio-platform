import { paymentGatewaySchema } from '../schema'

export const paymentGatewayCreateSchema = paymentGatewaySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
