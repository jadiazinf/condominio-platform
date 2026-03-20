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
 *
 * Two scenarios:
 * - Recurring service: `executionDay` (1-28) + `isTemplate: true`, `executionDate` is omitted.
 *   The template is cloned per period during quota generation.
 * - One-time service (paid in installments): `executionDate` (fixed date), `isTemplate: false`.
 */
export type TWizardExecutionData = {
  title: string
  description?: string
  executionDate?: string | null
  executionDay?: number | null
  isTemplate?: boolean
  totalAmount: string
  currencyId: string
  invoiceNumber?: string
  items: TServiceExecutionItem[]
  attachments: Array<{
    name: string
    url: string
    mimeType: string
    size: number
    storagePath: string
  }>
  notes?: string
}
