import { z } from 'zod'
import { notificationTemplateCreateSchema } from './createDto'
import { notificationTemplateUpdateSchema } from './updateDto'

export type TNotificationTemplateCreate = z.infer<typeof notificationTemplateCreateSchema>
export type TNotificationTemplateUpdate = z.infer<typeof notificationTemplateUpdateSchema>
