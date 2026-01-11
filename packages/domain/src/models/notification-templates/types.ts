import { z } from 'zod'
import {
  notificationTemplateSchema,
  ENotificationCategories,
  ENotificationChannels,
} from './schema'

export type TNotificationCategory = (typeof ENotificationCategories)[number]
export type TNotificationChannel = (typeof ENotificationChannels)[number]

export type TNotificationTemplate = z.infer<typeof notificationTemplateSchema>
