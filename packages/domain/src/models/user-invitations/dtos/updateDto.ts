import { z } from 'zod'
import { EUserInvitationStatus } from '../schema'

export const userInvitationUpdateSchema = z
  .object({
    status: z.enum(EUserInvitationStatus),
    expiresAt: z.date(),
    acceptedAt: z.date().nullable(),
    emailError: z.string().nullable(),
  })
  .partial()
