import { z } from 'zod'
import { EUserInvitationStatus, userInvitationSchema } from './schema'

export type TUserInvitationStatus = (typeof EUserInvitationStatus)[number]

export type TUserInvitation = z.infer<typeof userInvitationSchema>
