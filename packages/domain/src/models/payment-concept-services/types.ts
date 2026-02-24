import { z } from 'zod'
import {
  paymentConceptServiceSchema,
  paymentConceptServiceCreateSchema,
  paymentConceptServiceLinkSchema,
} from './schema'

export type TPaymentConceptService = z.infer<typeof paymentConceptServiceSchema>
export type TPaymentConceptServiceCreate = z.infer<typeof paymentConceptServiceCreateSchema>
export type TPaymentConceptServiceLink = z.infer<typeof paymentConceptServiceLinkSchema>
