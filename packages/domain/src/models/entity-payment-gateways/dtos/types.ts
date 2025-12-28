import { z } from 'zod'
import { entityPaymentGatewayCreateSchema } from './createDto'
import { entityPaymentGatewayUpdateSchema } from './updateDto'

export type TEntityPaymentGatewayCreate = z.infer<typeof entityPaymentGatewayCreateSchema>
export type TEntityPaymentGatewayUpdate = z.infer<typeof entityPaymentGatewayUpdateSchema>
