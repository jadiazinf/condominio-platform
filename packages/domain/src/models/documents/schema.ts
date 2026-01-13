import { z } from 'zod'
import { baseModelSchema, dateField } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { unitSchema } from '../units/schema'
import { userSchema } from '../users/schema'
import { paymentSchema } from '../payments/schema'
import { quotaSchema } from '../quotas/schema'
import { expenseSchema } from '../expenses/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.documents

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
  documentType: z.enum(EDocumentTypes, { error: d.documentType.invalid }),
  title: z.string({ error: d.title.required }).max(255, { error: d.title.max }),
  description: z.string().nullable(),
  condominiumId: z.uuid().nullable(),
  buildingId: z.uuid().nullable(),
  unitId: z.uuid().nullable(),
  userId: z.uuid().nullable(),
  paymentId: z.uuid().nullable(),
  quotaId: z.uuid().nullable(),
  expenseId: z.uuid().nullable(),
  fileUrl: z.string({ error: d.fileUrl.required }).url({ error: d.fileUrl.invalid }),
  fileName: z.string().max(255, { error: d.fileName.max }).nullable(),
  fileSize: z.number().int().nullable(),
  fileType: z.string().max(50, { error: d.fileType.max }).nullable(),
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
