import { z } from 'zod'
import { EConceptTypes, ERecurrencePeriods, paymentConceptSchema } from './schema'

export type TConceptType = (typeof EConceptTypes)[number]
export type TRecurrencePeriod = (typeof ERecurrencePeriods)[number]

export type TPaymentConcept = z.infer<typeof paymentConceptSchema>
