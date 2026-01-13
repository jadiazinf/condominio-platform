import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.paymentConcepts

export const EConceptTypes = [
  'maintenance',
  'condominium_fee',
  'extraordinary',
  'fine',
  'other',
] as const

export const ERecurrencePeriods = ['monthly', 'quarterly', 'yearly'] as const

export const paymentConceptSchema = baseModelSchema.extend({
  condominiumId: z.uuid({ error: d.condominiumId.invalid }).nullable(),
  buildingId: z.uuid({ error: d.buildingId.invalid }).nullable(),
  name: z.string({ error: d.name.required }).max(255, { error: d.name.max }),
  description: z.string().nullable(),
  conceptType: z.enum(EConceptTypes, { error: d.conceptType.invalid }),
  isRecurring: z.boolean().default(true),
  recurrencePeriod: z.enum(ERecurrencePeriods, { error: d.recurrencePeriod.invalid }).nullable(),
  currencyId: z.uuid({ error: d.currencyId.invalid }),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid({ error: d.createdBy.invalid }).nullable(),
  // Relations
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
  currency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})
