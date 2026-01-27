import { z } from 'zod'
import { subscriptionInvoiceCreateSchema } from './createDto'
import { subscriptionInvoiceUpdateSchema } from './updateDto'

export type TSubscriptionInvoiceCreate = z.infer<typeof subscriptionInvoiceCreateSchema>
export type TSubscriptionInvoiceUpdate = z.infer<typeof subscriptionInvoiceUpdateSchema>
