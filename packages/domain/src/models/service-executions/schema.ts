import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { attachmentSchema } from '../support-ticket-messages/schema'

export const serviceExecutionItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
})

export const serviceExecutionSchema = baseModelSchema.extend({
  serviceId: z.uuid(),
  condominiumId: z.uuid(),
  paymentConceptId: z.uuid().nullable().optional(),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  executionDate: z.string(),
  totalAmount: z.string(),
  currencyId: z.uuid(),
  invoiceNumber: z.string().max(100).nullable(),
  items: z.array(serviceExecutionItemSchema).default([]),
  attachments: z.array(attachmentSchema).default([]),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
})

export const serviceExecutionCreateSchema = z.object({
  serviceId: z.string().uuid(),
  condominiumId: z.string().uuid(),
  paymentConceptId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  executionDate: z.string(),
  totalAmount: z.string().or(z.number()).transform(v => String(v)),
  currencyId: z.string().uuid(),
  invoiceNumber: z.string().max(100).optional(),
  items: z.array(serviceExecutionItemSchema).default([]),
  attachments: z.array(attachmentSchema).default([]),
  notes: z.string().max(5000).optional(),
})

export const serviceExecutionUpdateSchema = serviceExecutionCreateSchema
  .omit({ serviceId: true, condominiumId: true })
  .partial()
