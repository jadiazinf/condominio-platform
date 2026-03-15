import { z } from 'zod'
import { EGatewayTransactionStatuses, gatewayTransactionSchema } from './schema'

export type TGatewayTransactionStatus = (typeof EGatewayTransactionStatuses)[number]

export type TGatewayTransaction = z.infer<typeof gatewayTransactionSchema>
