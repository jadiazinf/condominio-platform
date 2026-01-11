import { z } from 'zod'
import { notificationSchema, EPriorities } from './schema'

export type TPriority = (typeof EPriorities)[number]
export type TNotification = z.infer<typeof notificationSchema>
