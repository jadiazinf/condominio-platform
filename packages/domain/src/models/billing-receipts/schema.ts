import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'

export const EBillingReceiptStatuses = [
  'draft',
  'issued',
  'paid',
  'partial',
  'voided',
] as const

export const billingReceiptSchema = baseModelSchema.extend({
  condominiumId: z.uuid(),
  unitId: z.uuid(),
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  receiptNumber: z.string().min(1).max(50),
  status: z.enum(EBillingReceiptStatuses).default('draft'),
  issuedAt: z.coerce.date().nullable(),
  dueDate: dateField.nullable(),
  subtotal: z.string().default('0'),
  reserveFundAmount: z.string().default('0'),
  previousBalance: z.string().default('0'),
  interestAmount: z.string().default('0'),
  lateFeeAmount: z.string().default('0'),
  discountAmount: z.string().default('0'),
  totalAmount: z.string(),
  currencyId: z.uuid(),
  receiptType: z.enum(['original', 'complementary', 'corrective']).default('original'),
  parentReceiptId: z.uuid().nullable(),
  assemblyMinuteId: z.uuid().nullable(),
  replacesReceiptId: z.uuid().nullable(),
  voidReason: z.string().nullable(),
  budgetId: z.uuid().nullable(),
  pdfUrl: z.string().nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  generatedBy: z.uuid().nullable(),
})
