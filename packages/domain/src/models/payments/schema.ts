import { z } from 'zod'
import { baseModelSchema, dateField, timestampField } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { unitSchema } from '../units/schema'
import { currencySchema } from '../currencies/schema'
import { paymentGatewaySchema } from '../payment-gateways/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.payments

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
  userId: z.uuid({ error: d.userId.invalid }),
  unitId: z.uuid({ error: d.unitId.invalid }),
  amount: z.string({ error: d.amount.required }),
  currencyId: z.uuid({ error: d.currencyId.invalid }),
  paidAmount: z.string().nullable(),
  paidCurrencyId: z.uuid().nullable(),
  exchangeRate: z.string().nullable(),
  paymentMethod: z.enum(EPaymentMethods, { error: d.paymentMethod.invalid }),
  paymentGatewayId: z.uuid().nullable(),
  paymentDetails: z.record(z.string(), z.unknown()).nullable(),
  paymentDate: dateField,
  registeredAt: timestampField,
  status: z.enum(EPaymentStatuses, { error: d.status.invalid }).default('completed'),
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
