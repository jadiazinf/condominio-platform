import { z } from 'zod'
import { notificationCreateSchema } from './createDto'
import { notificationUpdateSchema } from './updateDto'

export type TNotificationCreate = z.infer<typeof notificationCreateSchema>
export type TNotificationUpdate = z.infer<typeof notificationUpdateSchema>
