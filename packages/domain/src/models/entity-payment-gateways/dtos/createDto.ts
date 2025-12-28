import { entityPaymentGatewaySchema } from '../schema'

export const entityPaymentGatewayCreateSchema = entityPaymentGatewaySchema.omit({
  id: true,
  createdAt: true,
  paymentGateway: true,
  condominium: true,
  building: true,
})
