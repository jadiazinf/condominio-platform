import { gatewayTransactionSchema } from '../schema'

export const gatewayTransactionCreateSchema = gatewayTransactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
