import { z } from 'zod'
import { EUserInvitationStatus } from '../schema'

export const userInvitationCreateSchema = z.object({
  userId: z.uuid(),
  condominiumId: z.uuid().nullable().optional(),
  roleId: z.uuid(),
  token: z.string().max(128),
  tokenHash: z.string().max(64),
  status: z.enum(EUserInvitationStatus).default('pending').optional(),
  email: z.email().max(255),
  expiresAt: z.date(),
  acceptedAt: z.date().nullable().optional(),
  emailError: z.string().nullable().optional(),
  createdBy: z.uuid().nullable().optional(),
})
