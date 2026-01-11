import { userFcmTokenSchema } from '../schema'

export const userFcmTokenUpdateSchema = userFcmTokenSchema
  .pick({
    deviceName: true,
    isActive: true,
    lastUsedAt: true,
    metadata: true,
  })
  .partial()
