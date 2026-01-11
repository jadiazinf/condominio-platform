import { z } from 'zod'
import { userFcmTokenCreateSchema } from './createDto'
import { userFcmTokenUpdateSchema } from './updateDto'

export type TUserFcmTokenCreate = z.infer<typeof userFcmTokenCreateSchema>
export type TUserFcmTokenUpdate = z.infer<typeof userFcmTokenUpdateSchema>
