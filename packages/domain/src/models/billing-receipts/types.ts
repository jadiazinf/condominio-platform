import { z } from 'zod'
import { billingReceiptSchema, EBillingReceiptStatuses } from './schema'

export type TBillingReceipt = z.infer<typeof billingReceiptSchema>
export type TBillingReceiptStatus = (typeof EBillingReceiptStatuses)[number]
