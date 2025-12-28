import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { unitSchema } from '../units/schema'
import { userSchema } from '../users/schema'
import { paymentSchema } from '../payments/schema'
import { quotaSchema } from '../quotas/schema'
import { expenseSchema } from '../expenses/schema'

export const EDocumentTypes = [
  'invoice',
  'receipt',
  'statement',
  'contract',
  'regulation',
  'minutes',
  'other',
] as const

export const documentSchema = baseModelSchema.extend({
  documentType: z.enum(EDocumentTypes),
  title: z.string().max(255),
  description: z.string().nullable(),
  condominiumId: z.uuid().nullable(),
  buildingId: z.uuid().nullable(),
  unitId: z.uuid().nullable(),
  userId: z.uuid().nullable(),
  paymentId: z.uuid().nullable(),
  quotaId: z.uuid().nullable(),
  expenseId: z.uuid().nullable(),
  fileUrl: z.string().url(),
  fileName: z.string().max(255).nullable(),
  fileSize: z.number().int().nullable(),
  fileType: z.string().max(50).nullable(),
  documentDate: dateField.nullable(),
  documentNumber: z.string().max(100).nullable(),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
  unit: unitSchema.optional(),
  user: userSchema.optional(),
  payment: paymentSchema.optional(),
  quota: quotaSchema.optional(),
  expense: expenseSchema.optional(),
  createdByUser: userSchema.optional(),
})
