import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'
import { unitSchema } from '../units/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.unitOwnerships

export const EOwnershipTypes = ['owner', 'co-owner', 'tenant'] as const

export const unitOwnershipSchema = baseModelSchema.extend({
  unitId: z.uuid({ error: d.unitId.invalid }),
  userId: z.uuid({ error: d.userId.invalid }),
  ownershipType: z.enum(EOwnershipTypes, { error: d.ownershipType.invalid }),
  ownershipPercentage: z.string().nullable(),
  titleDeedNumber: z.string().max(100, { error: d.titleDeedNumber.max }).nullable(),
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
