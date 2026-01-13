import { z } from 'zod'
import { userNotificationPreferenceCreateSchema } from './createDto'
import { userNotificationPreferenceUpdateSchema } from './updateDto'

export type TUserNotificationPreferenceCreate = z.infer<
  typeof userNotificationPreferenceCreateSchema
>
export type TUserNotificationPreferenceUpdate = z.infer<
  typeof userNotificationPreferenceUpdateSchema
>
