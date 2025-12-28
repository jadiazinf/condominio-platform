import { z } from 'zod'
import { baseModelSchema, dateField, timestampField } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { expenseCategorySchema } from '../expense-categories/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'

export const EExpenseStatuses = ['pending', 'approved', 'rejected', 'paid'] as const

export const expenseSchema = baseModelSchema.extend({
  condominiumId: z.uuid().nullable(),
  buildingId: z.uuid().nullable(),
  expenseCategoryId: z.uuid().nullable(),
  description: z.string(),
  expenseDate: dateField,
  amount: z.string(),
  currencyId: z.uuid(),
  vendorName: z.string().max(255).nullable(),
  vendorTaxId: z.string().max(100).nullable(),
  invoiceNumber: z.string().max(100).nullable(),
  invoiceUrl: z.string().url().nullable(),
  status: z.enum(EExpenseStatuses).default('pending'),
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
