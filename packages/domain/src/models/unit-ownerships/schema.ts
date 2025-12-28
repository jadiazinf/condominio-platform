import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'
import { unitSchema } from '../units/schema'
import { userSchema } from '../users/schema'

export const EOwnershipTypes = ['owner', 'co-owner', 'tenant'] as const

export const unitOwnershipSchema = baseModelSchema.extend({
  unitId: z.uuid(),
  userId: z.uuid(),
  ownershipType: z.enum(EOwnershipTypes),
  ownershipPercentage: z.string().nullable(),
  titleDeedNumber: z.string().max(100).nullable(),
  titleDeedDate: dateField.nullable(),
  startDate: dateField,
  endDate: dateField.nullable(),
  isActive: z.boolean().default(true),
  isPrimaryResidence: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  // Relations
  unit: unitSchema.optional(),
  user: userSchema.optional(),
})
