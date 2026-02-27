import { z } from 'zod'
import { EConceptTypes, ERecurrencePeriods, EChargeAdjustmentTypes } from '../schema'

export const paymentConceptUpdateSchema = z.object({
  condominiumId: z.uuid().nullable().optional(),
  buildingId: z.uuid().nullable().optional(),
  name: z.string().max(255).optional(),
  description: z.string().nullable().optional(),
  conceptType: z.enum(EConceptTypes).optional(),
  isRecurring: z.boolean().optional(),
  recurrencePeriod: z.enum(ERecurrencePeriods).nullable().optional(),
  currencyId: z.uuid().optional(),
  allowsPartialPayment: z.boolean().optional(),
  latePaymentType: z.enum(EChargeAdjustmentTypes).optional(),
  latePaymentValue: z.number().min(0).nullable().optional(),
  latePaymentGraceDays: z.number().int().min(0).optional(),
  earlyPaymentType: z.enum(EChargeAdjustmentTypes).optional(),
  earlyPaymentValue: z.number().min(0).nullable().optional(),
  earlyPaymentDaysBeforeDue: z.number().int().min(0).optional(),
  issueDay: z.number().int().min(1).max(28).nullable().optional(),
  dueDay: z.number().int().min(1).max(28).nullable().optional(),
  effectiveFrom: z.coerce.date().nullable().optional(),
  effectiveUntil: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdBy: z.uuid().nullable().optional(),
})
