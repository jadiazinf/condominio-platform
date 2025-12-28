import { z } from 'zod'
import { paymentCreateSchema } from './createDto'
import { paymentUpdateSchema } from './updateDto'

export type TPaymentCreate = z.infer<typeof paymentCreateSchema>
export type TPaymentUpdate = z.infer<typeof paymentUpdateSchema>
