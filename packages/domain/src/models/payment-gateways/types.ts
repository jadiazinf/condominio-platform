import { z } from 'zod'
import { EGatewayTypes, paymentGatewaySchema } from './schema'

export type TGatewayType = (typeof EGatewayTypes)[number]

export type TPaymentGateway = z.infer<typeof paymentGatewaySchema>
