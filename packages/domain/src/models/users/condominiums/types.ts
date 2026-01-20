import { z } from 'zod'
import { userCondominiumAccessSchema, userCondominiumsResponseSchema } from './schema'

export type TUserCondominiumAccess = z.infer<typeof userCondominiumAccessSchema>
export type TUserCondominiumsResponse = z.infer<typeof userCondominiumsResponseSchema>
