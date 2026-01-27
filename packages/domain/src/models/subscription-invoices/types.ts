import { z } from 'zod'
import { subscriptionInvoiceSchema, EInvoiceStatus } from './schema'

export type TInvoiceStatus = (typeof EInvoiceStatus)[number]
export type TSubscriptionInvoice = z.infer<typeof subscriptionInvoiceSchema>
