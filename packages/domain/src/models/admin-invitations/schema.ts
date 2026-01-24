import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'

export const EAdminInvitationStatus = ['pending', 'accepted', 'expired', 'cancelled'] as const

export const adminInvitationSchema = baseModelSchema.extend({
  userId: z.uuid(),
  managementCompanyId: z.uuid(),
  token: z.string().max(128),
  tokenHash: z.string().max(64),
  status: z.enum(EAdminInvitationStatus).default('pending'),
  email: z.email().max(255),
  expiresAt: timestampField,
  acceptedAt: timestampField.nullable(),
  emailError: z.string().nullable(),
  createdBy: z.uuid().nullable(),
})
