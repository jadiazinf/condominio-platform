import { z } from 'zod'
import { entityPaymentGatewaySchema } from './schema'

export type TEntityPaymentGateway = z.infer<typeof entityPaymentGatewaySchema>
