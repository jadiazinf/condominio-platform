import { z } from 'zod'
import { EAdminInvitationStatus, adminInvitationSchema } from './schema'

export type TAdminInvitationStatus = (typeof EAdminInvitationStatus)[number]

export type TAdminInvitation = z.infer<typeof adminInvitationSchema>
