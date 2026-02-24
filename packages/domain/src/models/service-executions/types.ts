import { z } from 'zod'
import {
  EServiceExecutionStatuses,
  serviceExecutionSchema,
  serviceExecutionItemSchema,
  serviceExecutionCreateSchema,
  serviceExecutionUpdateSchema,
} from './schema'

export type TServiceExecutionStatus = (typeof EServiceExecutionStatuses)[number]
export type TServiceExecution = z.infer<typeof serviceExecutionSchema>
export type TServiceExecutionItem = z.infer<typeof serviceExecutionItemSchema>
export type TServiceExecutionCreate = z.infer<typeof serviceExecutionCreateSchema>
export type TServiceExecutionUpdate = z.infer<typeof serviceExecutionUpdateSchema>
