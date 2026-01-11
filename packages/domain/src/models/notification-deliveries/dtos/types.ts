import { z } from 'zod'
import { notificationDeliveryCreateSchema } from './createDto'
import { notificationDeliveryUpdateSchema } from './updateDto'

export type TNotificationDeliveryCreate = z.infer<typeof notificationDeliveryCreateSchema>
export type TNotificationDeliveryUpdate = z.infer<typeof notificationDeliveryUpdateSchema>
