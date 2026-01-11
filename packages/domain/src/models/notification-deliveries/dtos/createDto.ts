import { notificationDeliverySchema } from '../schema'

export const notificationDeliveryCreateSchema = notificationDeliverySchema.omit({
  id: true,
  createdAt: true,
  notification: true,
})
