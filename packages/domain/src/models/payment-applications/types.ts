import { z } from 'zod'
import { paymentApplicationSchema } from './schema'

export type TPaymentApplication = z.infer<typeof paymentApplicationSchema>
