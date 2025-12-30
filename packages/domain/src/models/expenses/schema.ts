import { z } from 'zod'
import { baseModelSchema, dateField, timestampField } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { expenseCategorySchema } from '../expense-categories/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.expenses

export const EExpenseStatuses = ['pending', 'approved', 'rejected', 'paid'] as const

export const expenseSchema = baseModelSchema.extend({
  condominiumId: z.uuid().nullable(),
  buildingId: z.uuid().nullable(),
  expenseCategoryId: z.uuid().nullable(),
  description: z.string({ error: d.description.required }),
  expenseDate: dateField,
  amount: z.string({ error: d.amount.required }),
  currencyId: z.uuid({ error: d.currencyId.invalid }),
  vendorName: z.string().max(255, { error: d.vendorName.max }).nullable(),
  vendorTaxId: z.string().max(100, { error: d.vendorTaxId.max }).nullable(),
  invoiceNumber: z.string().max(100, { error: d.invoiceNumber.max }).nullable(),
  invoiceUrl: z.string().url().nullable(),
  status: z.enum(EExpenseStatuses, { error: d.status.invalid }).default('pending'),
  approvedBy: z.uuid().nullable(),
  approvedAt: timestampField.nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
  expenseCategory: expenseCategorySchema.optional(),
  currency: currencySchema.optional(),
  approvedByUser: userSchema.optional(),
  createdByUser: userSchema.optional(),
})
