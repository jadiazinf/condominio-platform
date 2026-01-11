import { z } from 'zod'
import { paymentPendingAllocationCreateSchema } from './createDto'
import { paymentPendingAllocationUpdateSchema } from './updateDto'

export type TPaymentPendingAllocationCreate = z.infer<typeof paymentPendingAllocationCreateSchema>
export type TPaymentPendingAllocationUpdate = z.infer<typeof paymentPendingAllocationUpdateSchema>
