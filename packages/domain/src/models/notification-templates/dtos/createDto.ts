import { notificationTemplateSchema } from '../schema'

export const notificationTemplateCreateSchema = notificationTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdByUser: true,
})
