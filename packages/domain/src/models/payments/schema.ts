import { z } from 'zod'
import { baseModelSchema, dateField, timestampField } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { unitSchema } from '../units/schema'
import { currencySchema } from '../currencies/schema'
import { paymentGatewaySchema } from '../payment-gateways/schema'

export const EPaymentMethods = [
  'transfer',
  'cash',
  'card',
  'mobile_payment',
  'gateway',
  'other',
] as const

export const EPaymentStatuses = [
  'pending',
  'pending_verification',
  'completed',
  'failed',
  'refunded',
  'rejected',
] as const

export const paymentSchema = baseModelSchema.extend({
  paymentNumber: z.string().max(100).nullable(),
  userId: z.uuid(),
  unitId: z.uuid(),
  amount: z.string(),
  currencyId: z.uuid(),
  paidAmount: z.string().nullable(),
  paidCurrencyId: z.uuid().nullable(),
  exchangeRate: z.string().nullable(),
  paymentMethod: z.enum(EPaymentMethods),
  paymentGatewayId: z.uuid().nullable(),
  paymentDetails: z.record(z.string(), z.unknown()).nullable(),
  paymentDate: dateField,
  registeredAt: timestampField,
  status: z.enum(EPaymentStatuses).default('completed'),
  receiptUrl: z.string().url().nullable(),
  receiptNumber: z.string().max(100).nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  registeredBy: z.uuid().nullable(),
  // Verification fields
  verifiedBy: z.uuid().nullable(),
  verifiedAt: timestampField.nullable(),
  verificationNotes: z.string().nullable(),
  // Relations
  user: userSchema.optional(),
  unit: unitSchema.optional(),
  currency: currencySchema.optional(),
  paidCurrency: currencySchema.optional(),
  paymentGateway: paymentGatewaySchema.optional(),
  registeredByUser: userSchema.optional(),
  verifiedByUser: userSchema.optional(),
})
