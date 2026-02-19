import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'

// Reuse the same status values as admin invitations
export const EUserInvitationStatus = ['pending', 'accepted', 'expired', 'cancelled'] as const

export const userInvitationSchema = baseModelSchema.extend({
  userId: z.uuid(),
  condominiumId: z.uuid().nullable(),
  unitId: z.uuid().nullable(),
  roleId: z.uuid(),
  token: z.string().max(128),
  tokenHash: z.string().max(64),
  status: z.enum(EUserInvitationStatus).default('pending'),
  email: z.email().max(255),
  expiresAt: timestampField,
  acceptedAt: timestampField.nullable(),
  emailError: z.string().nullable(),
  createdBy: z.uuid().nullable(),
})
