import { z } from 'zod'
import {
  serviceExecutionSchema,
  serviceExecutionItemSchema,
  serviceExecutionCreateSchema,
  serviceExecutionUpdateSchema,
} from './schema'

export type TServiceExecution = z.infer<typeof serviceExecutionSchema>
export type TServiceExecutionItem = z.infer<typeof serviceExecutionItemSchema>
export type TServiceExecutionCreate = z.infer<typeof serviceExecutionCreateSchema>
export type TServiceExecutionUpdate = z.infer<typeof serviceExecutionUpdateSchema>

/**
 * Execution data captured in the wizard (serviceId, condominiumId, paymentConceptId are inferred).
 */
export type TWizardExecutionData = {
  title: string
  description?: string
  executionDate: string
  totalAmount: string
  currencyId: string
  invoiceNumber?: string
  items: TServiceExecutionItem[]
  attachments: Array<{ name: string; url: string; mimeType: string; size: number; storagePath: string }>
  notes?: string
}
