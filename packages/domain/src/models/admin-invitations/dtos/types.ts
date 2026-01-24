import { z } from 'zod'
import { adminInvitationCreateSchema } from './createDto'
import { adminInvitationUpdateSchema } from './updateDto'

export type TAdminInvitationCreate = z.infer<typeof adminInvitationCreateSchema>

export type TAdminInvitationUpdate = z.infer<typeof adminInvitationUpdateSchema>
