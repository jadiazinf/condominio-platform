import { gatewayTransactionCreateSchema } from './createDto'

export const gatewayTransactionUpdateSchema = gatewayTransactionCreateSchema.partial()
