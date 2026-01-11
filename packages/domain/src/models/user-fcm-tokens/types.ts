import { z } from 'zod'
import { userFcmTokenSchema } from './schema'

export type TUserFcmToken = z.infer<typeof userFcmTokenSchema>
