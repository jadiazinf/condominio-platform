import { z } from 'zod'
import { notificationDeliverySchema, EDeliveryStatuses } from './schema'

export type TDeliveryStatus = (typeof EDeliveryStatuses)[number]
export type TNotificationDelivery = z.infer<typeof notificationDeliverySchema>
