import { z } from 'zod'
import { paymentConceptCreateSchema } from './createDto'
import { paymentConceptUpdateSchema } from './updateDto'

export type TPaymentConceptCreate = z.infer<typeof paymentConceptCreateSchema>
export type TPaymentConceptUpdate = z.infer<typeof paymentConceptUpdateSchema>
