import { z } from 'zod'
import { EAccessRequestStatus, accessRequestSchema } from './schema'

export type TAccessRequestStatus = (typeof EAccessRequestStatus)[number]
export type TAccessRequest = z.infer<typeof accessRequestSchema>
