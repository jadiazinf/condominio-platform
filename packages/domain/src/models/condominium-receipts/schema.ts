import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.condominiumReceipts

export const EReceiptStatuses = ['draft', 'generated', 'sent', 'voided'] as const

export const condominiumReceiptSchema = baseModelSchema.extend({
  condominiumId: z.uuid({ error: d.condominiumId.invalid }),
  buildingId: z.uuid({ error: d.buildingId.invalid }),
  unitId: z.uuid({ error: d.unitId.invalid }),
  budgetId: z.uuid().nullable(),
  currencyId: z.uuid({ error: d.currencyId.invalid }),

  // Period
  periodYear: z.number({ error: d.periodYear.required }).int({ error: d.periodYear.invalid }),
  periodMonth: z
    .number({ error: d.periodMonth.required })
    .int()
    .min(1, { error: d.periodMonth.min })
    .max(12, { error: d.periodMonth.max }),

  // Identification
  receiptNumber: z
    .string({ error: d.receiptNumber.required })
    .max(50, { error: d.receiptNumber.max }),
  status: z.enum(EReceiptStatuses, { error: d.status.invalid }).default('draft'),

  // Amounts breakdown
  ordinaryAmount: z.string().default('0'),
  extraordinaryAmount: z.string().default('0'),
  reserveFundAmount: z.string().default('0'),
  interestAmount: z.string().default('0'),
  finesAmount: z.string().default('0'),
  previousBalance: z.string().default('0'),
  totalAmount: z.string().default('0'),

  // Unit snapshot
  unitAliquot: z.string().nullable(),

  // PDF
  pdfUrl: z.string().nullable(),

  // Timestamps
  generatedAt: timestampField.nullable(),
  sentAt: timestampField.nullable(),
  voidedAt: timestampField.nullable(),

  // Audit
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  generatedBy: z.uuid().nullable(),
})
