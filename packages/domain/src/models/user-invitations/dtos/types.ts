import { z } from 'zod'
import { userInvitationCreateSchema } from './createDto'
import { userInvitationUpdateSchema } from './updateDto'

export type TUserInvitationCreate = z.infer<typeof userInvitationCreateSchema>

export type TUserInvitationUpdate = z.infer<typeof userInvitationUpdateSchema>
