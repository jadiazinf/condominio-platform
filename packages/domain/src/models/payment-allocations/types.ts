import { z } from 'zod'
import { paymentAllocationSchema } from './schema'

export type TPaymentAllocation = z.infer<typeof paymentAllocationSchema>
