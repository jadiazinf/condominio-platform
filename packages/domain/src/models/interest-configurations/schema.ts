import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { paymentConceptSchema } from '../payment-concepts/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'

export const EInterestTypes = ['simple', 'compound', 'fixed_amount'] as const

export const ECalculationPeriods = ['monthly', 'daily', 'per_overdue_quota'] as const

export const interestConfigurationSchema = baseModelSchema.extend({
  condominiumId: z.uuid().nullable(),
  buildingId: z.uuid().nullable(),
  paymentConceptId: z.uuid().nullable(),
  name: z.string().max(255),
  description: z.string().nullable(),
  interestType: z.enum(EInterestTypes),
  interestRate: z.string().nullable(),
  fixedAmount: z.string().nullable(),
  calculationPeriod: z.enum(ECalculationPeriods).nullable(),
  gracePeriodDays: z.number().int().default(0),
  currencyId: z.uuid().nullable(),
  isActive: z.boolean().default(true),
  effectiveFrom: dateField,
  effectiveTo: dateField.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
  paymentConcept: paymentConceptSchema.optional(),
  currency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})
