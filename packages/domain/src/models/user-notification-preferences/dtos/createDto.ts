import { userNotificationPreferenceSchema } from '../schema'

export const userNotificationPreferenceCreateSchema = userNotificationPreferenceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  user: true,
})
