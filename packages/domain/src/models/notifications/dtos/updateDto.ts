import { z } from 'zod'

export const notificationUpdateSchema = z.object({
  isRead: z.boolean().optional(),
  readAt: z.date().nullable().optional(),
})
