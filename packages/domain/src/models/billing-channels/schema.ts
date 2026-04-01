import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'

export const EChannelTypes = ['receipt', 'standalone'] as const

export const EBillingFrequencies = [
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'one_time',
] as const

export const EGenerationStrategies = ['auto', 'manual'] as const

export const EFeeTypes = ['percentage', 'fixed', 'none'] as const

export const EAllocationStrategies = ['fifo', 'designated', 'fifo_interest_first'] as const

export const EBillingInterestTypes = ['simple', 'compound', 'fixed_amount', 'none'] as const

export const EInterestCapTypes = ['percentage_of_principal', 'fixed', 'none'] as const

export const billingChannelSchema = baseModelSchema.extend({
  condominiumId: z.uuid(),
  buildingId: z.uuid().nullable(),
  name: z.string().min(1).max(200),
  channelType: z.enum(EChannelTypes),
  currencyId: z.uuid(),
  managedBy: z.string().nullable(),
  distributionMethod: z.enum(['by_aliquot', 'equal_split', 'fixed_per_unit'] as const),
  frequency: z.enum(EBillingFrequencies),
  generationStrategy: z.enum(EGenerationStrategies),
  generationDay: z.number().int().min(1).max(28),
  dueDay: z.number().int().min(1).max(28),
  // Late payment
  latePaymentType: z.enum(EFeeTypes).default('none'),
  latePaymentValue: z.string().nullable(), // decimal stored as string
  gracePeriodDays: z.number().int().min(0).default(0),
  // Early payment
  earlyPaymentType: z.enum(EFeeTypes).default('none'),
  earlyPaymentValue: z.string().nullable(),
  earlyPaymentDaysBefore: z.number().int().min(0).default(0),
  // Interest
  interestType: z.enum(EBillingInterestTypes).default('simple'),
  interestRate: z.string().nullable(),
  interestCalculationPeriod: z.string().nullable(),
  interestGracePeriodDays: z.number().int().min(0).default(0),
  maxInterestCapType: z.enum(EInterestCapTypes).default('none'),
  maxInterestCapValue: z.string().nullable(),
  // Allocation
  allocationStrategy: z.enum(EAllocationStrategies).default('fifo'),
  assemblyReference: z.string().nullable(),
  isActive: z.boolean().default(true),
  effectiveFrom: dateField,
  effectiveUntil: dateField.nullable(),
  receiptNumberFormat: z.string().max(100).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
})
