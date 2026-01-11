import { notificationSchema } from '../schema'

export const notificationCreateSchema = notificationSchema.omit({
  id: true,
  createdAt: true,
  readAt: true,
  user: true,
  template: true,
})
