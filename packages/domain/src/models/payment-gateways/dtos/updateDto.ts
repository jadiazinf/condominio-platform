import { paymentGatewayCreateSchema } from './createDto'

export const paymentGatewayUpdateSchema = paymentGatewayCreateSchema.partial()
