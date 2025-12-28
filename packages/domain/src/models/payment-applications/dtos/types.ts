import { z } from 'zod'
import { paymentApplicationCreateSchema } from './createDto'
import { paymentApplicationUpdateSchema } from './updateDto'

export type TPaymentApplicationCreate = z.infer<typeof paymentApplicationCreateSchema>
export type TPaymentApplicationUpdate = z.infer<typeof paymentApplicationUpdateSchema>
