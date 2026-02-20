import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'
import { EOwnershipTypes } from '../unit-ownerships/schema'
import { userSchema } from '../users/schema'
import { unitSchema } from '../units/schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'

export const EAccessRequestStatus = ['pending', 'approved', 'rejected'] as const

export const accessRequestSchema = baseModelSchema.extend({
  condominiumId: z.uuid(),
  unitId: z.uuid(),
  userId: z.uuid(),
  accessCodeId: z.uuid(),
  ownershipType: z.enum(EOwnershipTypes),
  status: z.enum(EAccessRequestStatus),
  adminNotes: z.string().nullable(),
  reviewedBy: z.uuid().nullable(),
  reviewedAt: timestampField.nullable(),
  // Relations
  user: userSchema.optional(),
  unit: unitSchema.optional(),
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
})
