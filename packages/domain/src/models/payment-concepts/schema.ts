import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'

export const EConceptTypes = [
  'maintenance',
  'condominium_fee',
  'extraordinary',
  'fine',
  'other',
] as const

export const ERecurrencePeriods = ['monthly', 'quarterly', 'yearly'] as const

export const paymentConceptSchema = baseModelSchema.extend({
  condominiumId: z.uuid().nullable(),
  buildingId: z.uuid().nullable(),
  name: z.string().max(255),
  description: z.string().nullable(),
  conceptType: z.enum(EConceptTypes),
  isRecurring: z.boolean().default(true),
  recurrencePeriod: z.enum(ERecurrencePeriods).nullable(),
  currencyId: z.uuid(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
  currency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})
