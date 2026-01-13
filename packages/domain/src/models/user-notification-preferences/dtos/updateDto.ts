import { userNotificationPreferenceCreateSchema } from './createDto'

export const userNotificationPreferenceUpdateSchema =
  userNotificationPreferenceCreateSchema.partial()
