import { z } from 'zod'
import { EPaymentMethods, EPaymentStatuses, paymentSchema } from './schema'

export type TPaymentMethod = (typeof EPaymentMethods)[number]
export type TPaymentStatus = (typeof EPaymentStatuses)[number]

export type TPayment = z.infer<typeof paymentSchema>
