import type { z } from 'zod'
import type { condominiumReceiptSchema, EReceiptStatuses } from './schema'

export type TReceiptStatus = (typeof EReceiptStatuses)[number]
export type TCondominiumReceipt = z.infer<typeof condominiumReceiptSchema>
