import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { managementCompanySubscriptionSchema } from '../management-company-subscriptions/schema'
import { managementCompanySchema } from '../management-companies/schema'
import { currencySchema } from '../currencies/schema'

// Invoice status options
export const EInvoiceStatus = [
  'draft',
  'sent',
  'pending',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
] as const

export const subscriptionInvoiceSchema = baseModelSchema.extend({
  invoiceNumber: z.string().max(50),
  subscriptionId: z.uuid(),
  managementCompanyId: z.uuid(),

  // Montos
  amount: z.number().positive(),
  currencyId: z.uuid().nullable(),
  taxAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().positive(),

  // Estado y fechas
  status: z.enum(EInvoiceStatus).default('pending'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().nullable(),

  // Pago asociado
  paymentId: z.uuid().nullable(),
  paymentMethod: z.string().max(50).nullable(),

  // Período de facturación
  billingPeriodStart: z.coerce.date(),
  billingPeriodEnd: z.coerce.date(),

  // Metadata
  metadata: z.record(z.string(), z.unknown()).nullable(),

  // Relations
  subscription: managementCompanySubscriptionSchema.optional(),
  managementCompany: managementCompanySchema.optional(),
  currency: currencySchema.optional(),
})
