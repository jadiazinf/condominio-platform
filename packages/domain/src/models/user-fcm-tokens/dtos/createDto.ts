import { userFcmTokenSchema } from '../schema'

export const userFcmTokenCreateSchema = userFcmTokenSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
  user: true,
})
