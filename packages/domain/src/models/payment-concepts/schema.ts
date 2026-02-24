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
  'reserve_fund',
  'other',
] as const

export const ERecurrencePeriods = ['monthly', 'quarterly', 'yearly'] as const

export const EChargeAdjustmentTypes = ['percentage', 'fixed', 'none'] as const

export const EAssignmentScopes = ['condominium', 'building', 'unit'] as const

export const EDistributionMethods = ['by_aliquot', 'equal_split', 'fixed_per_unit'] as const

export const paymentConceptSchema = baseModelSchema.extend({
  condominiumId: z.uuid({ error: d.condominiumId.invalid }).nullable(),
  buildingId: z.uuid({ error: d.buildingId.invalid }).nullable(),
  name: z.string({ error: d.name.required }).max(255, { error: d.name.max }),
  description: z.string().nullable(),
  conceptType: z.enum(EConceptTypes, { error: d.conceptType.invalid }),
  isRecurring: z.boolean().default(true),
  recurrencePeriod: z.enum(ERecurrencePeriods, { error: d.recurrencePeriod.invalid }).nullable(),
  currencyId: z.uuid({ error: d.currencyId.invalid }),
  // Partial payment
  allowsPartialPayment: z.boolean().default(true),
  // Late payment surcharge
  latePaymentType: z.enum(EChargeAdjustmentTypes).default('none'),
  latePaymentValue: z.number().min(0).nullable(),
  latePaymentGraceDays: z.number().int().min(0).default(0),
  // Early payment discount
  earlyPaymentType: z.enum(EChargeAdjustmentTypes).default('none'),
  earlyPaymentValue: z.number().min(0).nullable(),
  earlyPaymentDaysBeforeDue: z.number().int().min(0).default(0),
  // Scheduling
  issueDay: z.number().int().min(1).max(28).nullable(),
  dueDay: z.number().int().min(1).max(28).nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid({ error: d.createdBy.invalid }).nullable(),
  // Relations
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
  currency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Payment Concept Assignments
// ─────────────────────────────────────────────────────────────────────────────

export const paymentConceptAssignmentSchema = baseModelSchema.extend({
  paymentConceptId: z.uuid(),
  scopeType: z.enum(EAssignmentScopes),
  condominiumId: z.uuid(),
  buildingId: z.uuid().nullable(),
  unitId: z.uuid().nullable(),
  distributionMethod: z.enum(EDistributionMethods),
  amount: z.number().positive(),
  isActive: z.boolean().default(true),
  assignedBy: z.uuid().nullable(),
})

export const paymentConceptAssignmentCreateSchema = z
  .object({
    paymentConceptId: z.uuid(),
    scopeType: z.enum(EAssignmentScopes),
    condominiumId: z.uuid(),
    buildingId: z.uuid().optional(),
    unitId: z.uuid().optional(),
    distributionMethod: z.enum(EDistributionMethods),
    amount: z.number().positive('Amount must be greater than 0'),
  })
  .superRefine((data, ctx) => {
    if (data.scopeType === 'building' && !data.buildingId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Building ID is required when scope is building',
        path: ['buildingId'],
      })
    }
    if (data.scopeType === 'unit' && !data.unitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unit ID is required when scope is unit',
        path: ['unitId'],
      })
    }
    if (data.scopeType === 'unit' && data.distributionMethod !== 'fixed_per_unit') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unit-level assignments must use fixed_per_unit distribution',
        path: ['distributionMethod'],
      })
    }
  })

export const paymentConceptAssignmentUpdateSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0').optional(),
  isActive: z.boolean().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Payment Concept Bank Accounts
// ─────────────────────────────────────────────────────────────────────────────

export const paymentConceptBankAccountSchema = z.object({
  id: z.uuid(),
  paymentConceptId: z.uuid(),
  bankAccountId: z.uuid(),
  assignedBy: z.uuid().nullable(),
  createdAt: z.coerce.date(),
})

export const paymentConceptBankAccountCreateSchema = z.object({
  paymentConceptId: z.uuid(),
  bankAccountId: z.uuid(),
})
