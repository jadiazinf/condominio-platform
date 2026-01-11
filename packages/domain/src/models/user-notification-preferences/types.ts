import { z } from 'zod'
import { userNotificationPreferenceSchema } from './schema'

export type TUserNotificationPreference = z.infer<typeof userNotificationPreferenceSchema>
