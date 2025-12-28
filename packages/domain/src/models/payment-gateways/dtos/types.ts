import { z } from 'zod'
import { paymentGatewayCreateSchema } from './createDto'
import { paymentGatewayUpdateSchema } from './updateDto'

export type TPaymentGatewayCreate = z.infer<typeof paymentGatewayCreateSchema>
export type TPaymentGatewayUpdate = z.infer<typeof paymentGatewayUpdateSchema>
