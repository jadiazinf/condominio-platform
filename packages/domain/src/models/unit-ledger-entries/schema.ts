import { z } from 'zod'
import { dateField } from '../../shared/base-model.schema'

export const ELedgerEntryTypes = ['debit', 'credit'] as const

export const ELedgerReferenceTypes = [
  'charge',
  'receipt',
  'payment',
  'interest',
  'late_fee',
  'discount',
  'credit_note',
  'debit_note',
  'adjustment',
  'void_reversal',
] as const

export const unitLedgerEntrySchema = z.object({
  id: z.uuid(),
  unitId: z.uuid(),
  condominiumId: z.uuid(),
  entryDate: dateField,
  entryType: z.enum(ELedgerEntryTypes),
  amount: z.string(), // decimal as string
  currencyId: z.uuid(),
  runningBalance: z.string(),
  description: z.string().nullable(),
  referenceType: z.enum(ELedgerReferenceTypes),
  referenceId: z.uuid(),
  paymentAmount: z.string().nullable(),
  paymentCurrencyId: z.uuid().nullable(),
  exchangeRateId: z.uuid().nullable(),
  createdBy: z.uuid().nullable(),
  createdAt: z.coerce.date(),
})
