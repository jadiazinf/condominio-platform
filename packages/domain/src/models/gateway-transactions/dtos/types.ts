import { z } from 'zod'
import { gatewayTransactionCreateSchema } from './createDto'
import { gatewayTransactionUpdateSchema } from './updateDto'

export type TGatewayTransactionCreate = z.infer<typeof gatewayTransactionCreateSchema>
export type TGatewayTransactionUpdate = z.infer<typeof gatewayTransactionUpdateSchema>
