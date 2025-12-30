import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { paymentConceptSchema } from '../payment-concepts/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.interestConfigurations

export const EInterestTypes = ['simple', 'compound', 'fixed_amount'] as const

export const ECalculationPeriods = ['monthly', 'daily', 'per_overdue_quota'] as const

export const interestConfigurationSchema = baseModelSchema.extend({
  condominiumId: z.uuid({ error: d.condominiumId.invalid }).nullable(),
  buildingId: z.uuid({ error: d.buildingId.invalid }).nullable(),
  paymentConceptId: z.uuid({ error: d.paymentConceptId.invalid }).nullable(),
  name: z
    .string({ error: d.name.required })
    .max(255, { error: d.name.max }),
  description: z.string().nullable(),
  interestType: z.enum(EInterestTypes, { error: d.interestType.invalid }),
  interestRate: z.string().nullable(),
  fixedAmount: z.string().nullable(),
  calculationPeriod: z.enum(ECalculationPeriods, { error: d.calculationPeriod.invalid }).nullable(),
  gracePeriodDays: z.number().int({ error: d.gracePeriodDays.invalid }).default(0),
  currencyId: z.uuid({ error: d.currencyId.invalid }).nullable(),
  isActive: z.boolean().default(true),
  effectiveFrom: dateField,
  effectiveTo: dateField.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid({ error: d.createdBy.invalid }).nullable(),
  // Relations
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
  paymentConcept: paymentConceptSchema.optional(),
  currency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})
