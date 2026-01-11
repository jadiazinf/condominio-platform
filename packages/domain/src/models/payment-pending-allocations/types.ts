import { z } from 'zod'
import { EAllocationStatuses, paymentPendingAllocationSchema } from './schema'

export type TAllocationStatus = (typeof EAllocationStatuses)[number]

export type TPaymentPendingAllocation = z.infer<typeof paymentPendingAllocationSchema>
