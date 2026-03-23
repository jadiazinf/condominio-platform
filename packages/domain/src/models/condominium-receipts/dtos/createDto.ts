import type { z } from 'zod'
import { condominiumReceiptSchema } from '../schema'

export const condominiumReceiptCreateSchema = condominiumReceiptSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  voidedAt: true,
  pdfUrl: true,
})

export type TCondominiumReceiptCreate = z.infer<typeof condominiumReceiptCreateSchema>
