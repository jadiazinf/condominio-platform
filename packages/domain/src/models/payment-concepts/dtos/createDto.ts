import { z } from 'zod'
import { paymentConceptSchema, ERecurrencePeriods } from '../schema'

export const paymentConceptCreateSchema = paymentConceptSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    condominium: true,
    building: true,
    currency: true,
    createdByUser: true,
  })
  .extend({
    // Make nullable fields also optional for creation (clients don't need to send null explicitly)
    buildingId: z.uuid().nullable().optional(),
    description: z.string().nullable().optional(),
    recurrencePeriod: z.enum(ERecurrencePeriods).nullable().optional(),
    latePaymentValue: z.number().min(0).nullable().optional(),
    earlyPaymentValue: z.number().min(0).nullable().optional(),
    issueDay: z.number().int().min(1).max(28).nullable().optional(),
    dueDay: z.number().int().min(1).max(28).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    createdBy: z.uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Recurring concepts require scheduling info
    if (data.isRecurring) {
      if (!data.recurrencePeriod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Recurrence period is required for recurring concepts',
          path: ['recurrencePeriod'],
        })
      }
      if (data.issueDay == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Issue day is required for recurring concepts',
          path: ['issueDay'],
        })
      }
      if (data.dueDay == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Due day is required for recurring concepts',
          path: ['dueDay'],
        })
      }
    }

    // Late payment validation
    if (data.latePaymentType !== 'none') {
      if (data.latePaymentValue == null || data.latePaymentValue <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Late payment value must be greater than 0',
          path: ['latePaymentValue'],
        })
      }
      if (data.latePaymentType === 'percentage' && data.latePaymentValue != null && data.latePaymentValue > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Late payment percentage cannot exceed 100%',
          path: ['latePaymentValue'],
        })
      }
    }

    // Early payment validation
    if (data.earlyPaymentType !== 'none') {
      if (data.earlyPaymentValue == null || data.earlyPaymentValue <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Early payment value must be greater than 0',
          path: ['earlyPaymentValue'],
        })
      }
      if (data.earlyPaymentDaysBeforeDue <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Days before due must be greater than 0 for early payment discounts',
          path: ['earlyPaymentDaysBeforeDue'],
        })
      }
      if (data.earlyPaymentType === 'percentage' && data.earlyPaymentValue != null && data.earlyPaymentValue > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Early payment percentage cannot exceed 100%',
          path: ['earlyPaymentValue'],
        })
      }
    }
  })
